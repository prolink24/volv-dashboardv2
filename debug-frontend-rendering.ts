/**
 * Frontend Rendering Debug Tool
 * 
 * Creates an HTML page that will render components in isolation to detect UI rendering issues
 */

import fs from 'fs';
import axios from 'axios';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const OUTPUT_DIR = './debug-output';

async function getDashboardData() {
  try {
    console.log('Fetching dashboard data from API...');
    const response = await axios.get(`${API_BASE_URL}/dashboard`);
    console.log(chalk.green('Successfully fetched dashboard data'));
    return response.data;
  } catch (error) {
    console.log(chalk.red(`Error fetching dashboard data: ${error.message}`));
    throw error;
  }
}

function createDebugHTML(dashboardData: any) {
  // Ensure the output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Format the dashboard data as a JavaScript object
  const dataJson = JSON.stringify(dashboardData, null, 2);
  
  // Create the HTML content with the dashboard data
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Debug</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow: auto;
    }
    .section {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .section h2 {
      margin-top: 0;
    }
    .error {
      color: red;
      font-weight: bold;
    }
    .warning {
      color: orange;
      font-weight: bold;
    }
    .success {
      color: green;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <h1>Dashboard Debug Information</h1>
  
  <div class="section">
    <h2>Dashboard Data Overview</h2>
    <p>Top-level keys: ${Object.keys(dashboardData).join(', ')}</p>
  </div>
  
  <div class="section">
    <h2>KPIs Section</h2>
    <div id="kpis-debug"></div>
    <script>
      const kpis = ${JSON.stringify(dashboardData.kpis || {})};
      const kpisDebug = document.getElementById('kpis-debug');
      
      let kpisHtml = '<table><tr><th>KPI</th><th>Value</th><th>Type</th><th>Status</th></tr>';
      
      for (const [key, value] of Object.entries(kpis)) {
        let status = '';
        let statusClass = '';
        
        if (value === undefined) {
          status = 'UNDEFINED - UI Error!';
          statusClass = 'error';
        } else if (value === null) {
          status = 'NULL - Potential UI Error';
          statusClass = 'warning';
        } else if (value === 0) {
          status = 'Zero value';
          statusClass = '';
        } else if (typeof value === 'number' && isNaN(value)) {
          status = 'NaN - UI Error!';
          statusClass = 'error';
        } else {
          status = 'OK';
          statusClass = 'success';
        }
        
        kpisHtml += \`
          <tr>
            <td>\${key}</td>
            <td>\${value}</td>
            <td>\${typeof value}</td>
            <td class="\${statusClass}">\${status}</td>
          </tr>
        \`;
      }
      
      kpisHtml += '</table>';
      kpisDebug.innerHTML = kpisHtml;
    </script>
  </div>
  
  <div class="section">
    <h2>Sales Team Section</h2>
    <div id="salesteam-debug"></div>
    <script>
      const salesTeam = ${JSON.stringify(dashboardData.salesTeam || [])};
      const salesTeamDebug = document.getElementById('salesteam-debug');
      
      if (salesTeam.length === 0) {
        salesTeamDebug.innerHTML = '<p class="warning">No sales team data available. This could cause UI errors.</p>';
      } else {
        let html = \`<p>Found \${salesTeam.length} sales team entries</p>\`;
        
        // Check first entry
        const firstEntry = salesTeam[0];
        const keys = Object.keys(firstEntry);
        
        html += '<p>First entry keys: ' + keys.join(', ') + '</p>';
        
        // Check for problematic values in all entries
        const requiredKeys = ['name', 'id', 'closed', 'cashCollected', 'contractedValue', 'calls', 'closingRate'];
        let hasErrors = false;
        
        html += '<h3>Potential Issues:</h3><ul>';
        
        for (const entry of salesTeam) {
          for (const key of requiredKeys) {
            if (!(key in entry)) {
              html += \`<li class="error">Missing required key \${key} in entry for \${entry.name || 'unnamed'}</li>\`;
              hasErrors = true;
            } else if (entry[key] === undefined) {
              html += \`<li class="error">Undefined value for \${key} in entry for \${entry.name || 'unnamed'}</li>\`;
              hasErrors = true;
            } else if (typeof entry[key] === 'number' && isNaN(entry[key])) {
              html += \`<li class="error">NaN value for \${key} in entry for \${entry.name || 'unnamed'}</li>\`;
              hasErrors = true;
            }
          }
        }
        
        if (!hasErrors) {
          html += '<li class="success">No obvious issues detected in sales team data</li>';
        }
        
        html += '</ul>';
        
        salesTeamDebug.innerHTML = html;
      }
    </script>
  </div>
  
  <div class="section">
    <h2>Other Metrics Sections</h2>
    <div id="other-metrics-debug"></div>
    <script>
      const sections = {
        'triageMetrics': ${JSON.stringify(dashboardData.triageMetrics || {})},
        'leadMetrics': ${JSON.stringify(dashboardData.leadMetrics || {})},
        'advancedMetrics': ${JSON.stringify(dashboardData.advancedMetrics || {})}
      };
      
      const otherMetricsDebug = document.getElementById('other-metrics-debug');
      let html = '';
      
      for (const [section, data] of Object.entries(sections)) {
        html += \`<h3>\${section}</h3>\`;
        
        if (Object.keys(data).length === 0) {
          html += \`<p class="warning">No data available for \${section}. This could cause UI errors.</p>\`;
          continue;
        }
        
        html += '<table><tr><th>Metric</th><th>Value</th><th>Type</th><th>Status</th></tr>';
        
        for (const [key, value] of Object.entries(data)) {
          let status = '';
          let statusClass = '';
          
          if (value === undefined) {
            status = 'UNDEFINED - UI Error!';
            statusClass = 'error';
          } else if (value === null) {
            status = 'NULL - Potential UI Error';
            statusClass = 'warning';
          } else if (value === 0) {
            status = 'Zero value';
            statusClass = '';
          } else if (typeof value === 'number' && isNaN(value)) {
            status = 'NaN - UI Error!';
            statusClass = 'error';
          } else {
            status = 'OK';
            statusClass = 'success';
          }
          
          html += \`
            <tr>
              <td>\${key}</td>
              <td>\${value}</td>
              <td>\${typeof value}</td>
              <td class="\${statusClass}">\${status}</td>
            </tr>
          \`;
        }
        
        html += '</table>';
      }
      
      otherMetricsDebug.innerHTML = html;
    </script>
  </div>
  
  <div class="section">
    <h2>Raw Dashboard Data</h2>
    <pre>${dataJson.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </div>
</body>
</html>
`;
  
  // Write the HTML file
  const outputPath = `${OUTPUT_DIR}/dashboard-debug.html`;
  fs.writeFileSync(outputPath, htmlContent);
  
  console.log(chalk.green(`Created debug HTML file at ${outputPath}`));
  return outputPath;
}

async function debugFrontendRendering() {
  console.log(chalk.blue('Starting frontend rendering debug...'));
  
  try {
    // Get the dashboard data
    const dashboardData = await getDashboardData();
    
    // Create a debug HTML file with the data
    const htmlPath = createDebugHTML(dashboardData);
    
    console.log(chalk.green(`\nDebugging complete! Open the following file in your browser to view the results:`));
    console.log(chalk.blue(htmlPath));
    
  } catch (error) {
    console.log(chalk.red(`Error during frontend rendering debug: ${error.message}`));
    console.error(error);
  }
}

// Run the debug process
debugFrontendRendering();