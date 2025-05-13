import { Client } from "@notionhq/client";

// Initialize Notion client
export const notion = new Client({
    auth: process.env.NOTION_INTEGRATION_SECRET!,
});

// Extract the page ID from the Notion page URL
function extractPageIdFromUrl(pageUrl: string): string {
    const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (match && match[1]) {
        return match[1];
    }

    throw Error("Failed to extract page ID");
}

// Get the parent page ID from environment variable
export const NOTION_PAGE_ID = process.env.NOTION_PAGE_URL ? 
    extractPageIdFromUrl(process.env.NOTION_PAGE_URL) : 
    null;

/**
 * Lists all child databases contained within the specified Notion page
 * @returns {Promise<Array<{id: string, title: string}>>} - Array of database objects with id and title
 */
export async function getNotionDatabases() {
    if (!NOTION_PAGE_ID) {
        throw new Error("NOTION_PAGE_URL environment variable not set");
    }

    // Array to store the child databases
    const childDatabases = [];

    try {
        // Query all child blocks in the specified page
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const response = await notion.blocks.children.list({
                block_id: NOTION_PAGE_ID,
                start_cursor: startCursor,
            });

            // Process the results
            for (const block of response.results) {
                // Check if the block is a child database
                // Type assertion to handle the PartialBlockObjectResponse issue
                if ('type' in block && block.type === "child_database") {
                    const databaseId = block.id;

                    // Retrieve the database title
                    try {
                        const databaseInfo = await notion.databases.retrieve({
                            database_id: databaseId,
                        });

                        // Add the database to our list
                        childDatabases.push(databaseInfo);
                    } catch (error) {
                        console.error(`Error retrieving database ${databaseId}:`, error);
                    }
                }
            }

            // Check if there are more results to fetch
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }

        return childDatabases;
    } catch (error) {
        console.error("Error listing child databases:", error);
        throw error;
    }
}

// Find a Notion database with the matching title
export async function findDatabaseByTitle(title: string) {
    if (!NOTION_PAGE_ID) {
        throw new Error("NOTION_PAGE_URL environment variable not set");
    }
    
    const databases = await getNotionDatabases();

    for (const db of databases) {
        const dbTitle = (db as any).title?.[0]?.plain_text?.toLowerCase() || "";
        if (dbTitle === title.toLowerCase()) {
            return db;
        }
    }

    return null;
}

// Create a database if one with a matching title does not exist
export async function createDatabaseIfNotExists(title: string, properties: any) {
    if (!NOTION_PAGE_ID) {
        throw new Error("NOTION_PAGE_URL environment variable not set");
    }
    
    const existingDb = await findDatabaseByTitle(title);
    if (existingDb) {
        return existingDb;
    }
    
    return await notion.databases.create({
        parent: {
            type: "page_id",
            page_id: NOTION_PAGE_ID
        },
        title: [
            {
                type: "text",
                text: {
                    content: title
                }
            }
        ],
        properties
    });
}

// Check if Notion integration is properly configured
export async function testNotionConnection() {
    if (!process.env.NOTION_INTEGRATION_SECRET) {
        return { success: false, error: "NOTION_INTEGRATION_SECRET not set" };
    }
    
    if (!process.env.NOTION_PAGE_URL) {
        return { success: false, error: "NOTION_PAGE_URL not set" };
    }
    
    try {
        const pageId = extractPageIdFromUrl(process.env.NOTION_PAGE_URL);
        const pageInfo = await notion.pages.retrieve({ page_id: pageId });
        return { 
            success: true, 
            message: "Successfully connected to Notion",
            pageInfo: {
                id: pageInfo.id,
                // Type assertion to handle the PartialPageObjectResponse issue
                createdTime: 'created_time' in pageInfo ? pageInfo.created_time : null,
                lastEditedTime: 'last_edited_time' in pageInfo ? pageInfo.last_edited_time : null
            }
        };
    } catch (error) {
        console.error("Error testing Notion connection:", error);
        return { 
            success: false, 
            error: "Failed to connect to Notion",
            details: error
        };
    }
}

// Create a page with attribution data for a contact in a Notion database
export async function createContactAttributionPage(databaseId: string, contact: any, attributionData: any) {
    const properties: any = {
        Name: {
            title: [
                {
                    text: {
                        content: contact.name || "Unnamed Contact"
                    }
                }
            ]
        },
        Email: {
            email: contact.email || ""
        },
        Source: {
            select: {
                name: contact.source || "Unknown"
            }
        },
        "Total Touchpoints": {
            number: attributionData.touchpoints?.length || 0
        },
        "First Touch": {
            rich_text: [
                {
                    text: {
                        content: attributionData.firstTouch ? 
                            `${attributionData.firstTouch.source} - ${attributionData.firstTouch.type}` : 
                            "None"
                    }
                }
            ]
        },
        "Last Touch": {
            rich_text: [
                {
                    text: {
                        content: attributionData.lastTouch ? 
                            `${attributionData.lastTouch.source} - ${attributionData.lastTouch.type}` : 
                            "None"
                    }
                }
            ]
        },
        "Last Updated": {
            date: {
                start: new Date().toISOString()
            }
        }
    };

    try {
        const response = await notion.pages.create({
            parent: {
                database_id: databaseId
            },
            properties
        });
        
        return response;
    } catch (error) {
        console.error("Error creating contact attribution page:", error);
        throw error;
    }
}

// Create a database specifically for storing attribution data
export async function setupAttributionDatabase() {
    if (!NOTION_PAGE_ID) {
        throw new Error("NOTION_PAGE_URL environment variable not set");
    }
    
    const databaseProperties = {
        Name: {
            title: {}
        },
        Email: {
            email: {}
        },
        Company: {
            rich_text: {}
        },
        Status: {
            select: {
                options: [
                    { name: "Lead", color: "blue" },
                    { name: "Opportunity", color: "yellow" },
                    { name: "Customer", color: "green" },
                    { name: "Churned", color: "red" }
                ]
            }
        },
        AttributionCertainty: {
            number: {
                format: "percent"
            }
        },
        FirstTouchChannel: {
            select: {
                options: [
                    { name: "Calendly", color: "blue" },
                    { name: "Close", color: "green" },
                    { name: "Typeform", color: "orange" },
                    { name: "Unknown", color: "gray" }
                ]
            }
        },
        LastTouchChannel: {
            select: {
                options: [
                    { name: "Calendly", color: "blue" },
                    { name: "Close", color: "green" },
                    { name: "Typeform", color: "orange" },
                    { name: "Unknown", color: "gray" }
                ]
            }
        },
        "Total Touchpoints": {
            number: {}
        },
        "Key Touchpoints": {
            number: {}
        },
        "First Touch": {
            rich_text: {}
        },
        "Last Touch": {
            rich_text: {}
        },
        "Last Updated": {
            date: {}
        },
        "Attribution Model": {
            rich_text: {}
        }
    };
    
    return await createDatabaseIfNotExists("Enhanced Attribution", databaseProperties);
}

/**
 * Stores enhanced attribution data for a contact in Notion
 * @param contact The contact information
 * @param attributionData The enhanced attribution data
 * @returns {Promise<{id: string}>} The created page ID
 */
export async function storeEnhancedAttributionData(contact: any, attributionData: any) {
    if (!NOTION_PAGE_ID) {
        throw new Error("NOTION_PAGE_URL environment variable not set");
    }

    try {
        // First, ensure we have the attribution database
        const database = await setupAttributionDatabase();
        
        // Check if we already have a page for this contact
        const response = await notion.databases.query({
            database_id: database.id,
            filter: {
                property: "Email",
                email: {
                    equals: contact.email
                }
            }
        });

        // Build the properties object
        const properties: any = {
            Name: {
                title: [
                    {
                        text: {
                            content: contact.name
                        }
                    }
                ]
            },
            Email: {
                email: contact.email
            },
            Company: {
                rich_text: [
                    {
                        text: {
                            content: contact.company || ""
                        }
                    }
                ]
            },
            Status: {
                select: {
                    name: contact.status || "Lead"
                }
            },
            AttributionCertainty: {
                number: attributionData.attributionCertainty || 0
            },
            "Total Touchpoints": {
                number: attributionData.timeline?.length || 0
            },
            "Key Touchpoints": {
                number: attributionData.timeline?.filter((e: any) => e.isKeyTouchpoint)?.length || 0
            },
            "Last Updated": {
                date: {
                    start: new Date().toISOString()
                }
            }
        };

        // Add first touch data if available
        if (attributionData.firstTouch) {
            properties.FirstTouchChannel = {
                select: {
                    name: attributionData.firstTouch.source === "close" ? "Close" : 
                         attributionData.firstTouch.source === "calendly" ? "Calendly" :
                         attributionData.firstTouch.source === "typeform" ? "Typeform" : "Unknown"
                }
            };
            properties["First Touch"] = {
                rich_text: [
                    {
                        text: {
                            content: `${attributionData.firstTouch.title} (${new Date(attributionData.firstTouch.date).toLocaleDateString()})`
                        }
                    }
                ]
            };
        }

        // Add last touch data if available
        if (attributionData.lastTouch) {
            properties.LastTouchChannel = {
                select: {
                    name: attributionData.lastTouch.source === "close" ? "Close" : 
                         attributionData.lastTouch.source === "calendly" ? "Calendly" :
                         attributionData.lastTouch.source === "typeform" ? "Typeform" : "Unknown"
                }
            };
            properties["Last Touch"] = {
                rich_text: [
                    {
                        text: {
                            content: `${attributionData.lastTouch.title} (${new Date(attributionData.lastTouch.date).toLocaleDateString()})`
                        }
                    }
                ]
            };
        }

        // Add attribution model info if available
        if (attributionData.attributionChains && attributionData.attributionChains.length > 0) {
            const primaryModel = attributionData.attributionChains[0];
            properties["Attribution Model"] = {
                rich_text: [
                    {
                        text: {
                            content: `${primaryModel.modelName} (${Math.round(primaryModel.weight * 100)}%)`
                        }
                    }
                ]
            };
        }

        // Update existing page or create a new one
        if (response.results.length > 0) {
            // Update existing page
            await notion.pages.update({
                page_id: response.results[0].id,
                properties
            });
            return response.results[0];
        } else {
            // Create new page
            const newPage = await notion.pages.create({
                parent: {
                    database_id: database.id
                },
                properties
            });
            return newPage;
        }
    } catch (error) {
        console.error("Error storing enhanced attribution data:", error);
        throw error;
    }
}