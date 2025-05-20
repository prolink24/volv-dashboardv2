-- Import Missing Calendly Events
-- This script will import missing Calendly events into the database
-- Generated: May 20, 2025

-- First, execute the query to find which events are missing from our database
WITH calendly_events AS (
  VALUES
    ('a083f101-590a-4dd9-a056-c4a5facd08fc'),
    ('f6342598-c49e-41ee-9c47-8cca99857abc'),
    ('378bef2b-6bc7-408c-aff4-820f7e94c517'),
    ('866630dc-5002-4627-8a5f-c235d52cf5aa'),
    ('31f77584-6265-4c9c-bc14-b6c487981906'),
    ('3d1137a8-6efc-4b6f-a8d3-c692ca9cc0e2'),
    ('1fbdc56c-a0d2-4363-8396-ed623e112d7f'),
    ('22fd5b86-1115-4190-8d69-f42d3189a50c'),
    ('2ec4665c-0f3a-4ba5-af9f-6ec58f639594'),
    ('343ac0c4-783e-42c5-8fe0-bd7022b40966'),
    ('9c194112-93e0-4be4-9c2f-019b6fdbf2fe'),
    ('45c176fb-4cf9-47c6-bf65-dd7ab35ef209'),
    ('bd4d66d2-1b51-45d9-abe5-59fa1d2368bf'),
    ('84bf3924-9d26-4bcd-8f06-dc30b64e788b'),
    ('60b5f6dd-d554-47ba-a895-63f439dffdf2'),
    ('0912d578-f3f4-46b9-b91b-a7ae413b28e4'),
    ('58ae56cf-7ee1-4170-8769-2e17f20c15e8'),
    ('bee02e9e-e68a-442e-ac33-f0ac4e97a74a'),
    ('42818cd4-acde-4fc9-aaf2-1f06858fe07c'),
    ('74adab2d-8a8a-4045-be2b-92b3e1af1115'),
    ('54875634-0d0c-46b5-a44c-78eb46dbc2eb'),
    ('36696a47-25b6-4bec-a0ae-f464c05eb0dd'),
    ('6b67d51c-638e-45b8-8594-6221a15a5785'),
    ('fa31d4fd-cfe4-4710-81f3-8ca7a3d2421a'),
    ('5e9c4507-ec33-4c5e-8a0d-12febd16fd8b'),
    ('968c1c38-ac49-4627-9109-fd0843252e4f'),
    ('12bae65e-bd2e-46d2-9a18-6ba0a854f526'),
    ('a533494b-7aa4-4336-98c8-9df3aec2d710'),
    ('c6cbc8d5-37cc-47db-9eb9-7a3e42bfb008'),
    ('4f7359a7-deac-47b5-a43e-867a9b59e3d4'),
    ('fc52f81a-4623-4af3-b81a-a34f176695ea'),
    ('5997a9f5-341f-4a7a-a3fc-f36ef09a9b56'),
    ('e2c3ecdc-37a1-439a-875a-21f5b2d52f6c'),
    ('018fc707-8c0f-48b9-9cae-2cdfca769eca'),
    ('80c29c6a-eeac-4fe8-9cba-dc8a3de953a3'),
    ('d9c5d973-307f-40d1-bad9-9bf3c272d83a'),
    ('8b9a4d7f-7839-4767-8fd4-6a9614326cd1'),
    ('1e9e87a6-893b-4c35-a95a-bb541a28c2d3'),
    ('03eae986-d11a-41a3-83ba-7a77b4339fc0'),
    ('2fbbde9b-902b-4a00-97c4-00f4eb9e9729'),
    ('5a8c2854-c938-4561-a20c-20376923ae53'),
    ('e1effbe5-320f-4de2-8fa5-ab093b0b2813'),
    ('7bbe4888-c8f2-4468-a419-ef380d12d60a'),
    ('42bc597b-3f1b-4c84-b8ba-ad4714eb6a64'),
    ('c0095f4d-889f-4903-ad48-cc01f176cba2'),
    ('7650257f-7772-4b41-8420-baddedac82ca'),
    ('d93e0793-e15e-4d21-8c01-590a3a8608df'),
    ('ab188525-6781-4a80-9aec-958ff735e6c8'),
    ('1d86f4b2-f72c-4465-8d2c-fba85d56614d'),
    ('f6f2fdb3-3b66-42c5-b312-279aca545132'),
    ('fd73b17e-eba1-48c2-be0c-0d116aca4fe7'),
    ('df56d6c0-d65c-4af5-98e3-d4690d07f2b0'),
    ('96ab8c4a-d47e-4203-baaf-830265838fb5'),
    ('2db76181-4555-4d9d-b7c3-8f1a1a44601f'),
    ('f348f41c-6660-4fd1-bfdc-35b990f96747'),
    ('91d429b6-b886-45b9-979b-127814d2b106'),
    ('19c46105-013b-4c8f-b4c4-6696715608af'),
    ('5ab5ce5c-2b2a-425b-91c4-9f92d1aaa500'),
    ('56f05f7d-65ca-4e28-9199-bd40efb09ef2'),
    ('16cd2bd7-662c-4366-a440-6914b8334e00'),
    ('cf7b48c8-0cbd-4210-98f5-211a4295ded4'),
    ('f7a5064c-86da-4ee3-aa9b-a8a6a48f7d78'),
    ('e5d70245-af08-427e-b438-4c29296bb8ea'),
    ('cf79cfb7-9f3f-426d-9c60-667398d3c21e'),
    ('9b1d437c-ac01-4d5a-b28a-169eaed46204'),
    ('be7e3ba7-ad7a-4232-af40-e4d652bf77f9'),
    ('0aaec3c8-e08a-4790-b3b0-6543f950769c'),
    ('b1b813d4-b3e3-4a53-ba47-134dd350c20e'),
    ('30f66a1a-8ba4-42fa-bb48-45eae042bedf'),
    ('5e6a8ba4-0e23-481e-b723-8cfb242acca8'),
    ('55d72579-a3bc-457f-9a7f-0bdc46b14609'),
    ('3ed416ff-5b33-4ea8-b661-e4f6d7f7ea8f'),
    ('9a664c86-ce9c-4ad3-8547-76d662bf8698'),
    ('77a29ba2-9422-45b1-aca2-b8567be42473'),
    ('4e5e87a1-c5f1-433f-a4e9-59b2f62a5aa7'),
    ('f8366a55-b892-419c-929b-4ad48328c039'),
    ('164cd67b-f849-475f-874d-fea4011d27f4'),
    ('4a17203c-18dc-4cc4-81a1-b0e947456742'),
    ('8363b8f7-3ad1-4b1d-91ef-d635953851a4'),
    ('c7a93845-52c8-4e07-8254-71d425133af8'),
    ('017f8ce2-4173-4614-b961-3fa0600ca4a6'),
    ('f0e83062-35d8-445d-8ee6-0c6f13f15027'),
    ('8fe296ee-2dac-4150-b848-7352f3b171d4'),
    ('c44dc463-7500-4dc0-9414-fff73e4fecab'),
    ('465f3b62-f45e-4731-8e81-0114e5373e05'),
    ('3dbf2142-e1cf-40b8-ade7-e22b31af9b24'),
    ('2049a95c-2575-4912-b382-0a650228d344'),
    ('a1492e8a-79df-42c3-bc82-bbbe38f230c2'),
    ('33756a80-6d12-4328-b34a-4003ed33fb43'),
    ('41020310-32a2-4d2d-9992-981ee42ac9b4'),
    ('3ed60904-1e6d-4f01-bf74-1098823bc6b5'),
    ('79152d04-4594-40a3-b386-6facfdf959ca'),
    ('2c8d567c-f9d1-424e-85da-34e39c5a2bc2'),
    ('814d8b57-14ec-481c-b1f3-8c7e50e868bb'),
    ('aad199c2-3e31-470b-85c5-ae308cac0166'),
    ('dea7082a-c891-4016-bbc0-a23fe28651fe'),
    ('8baea817-0a8a-47f6-8b14-2bc302a93909'),
    ('33ec838c-121d-4d1b-b99f-1c16739252ee'),
    ('2ac414ea-8b37-4d73-97cb-019c2b2deb95'),
    ('e4aab5c5-1f60-4ce0-aad0-4a6af7a7222b')
) AS t(event_id)
SELECT t.event_id
FROM calendly_events t
LEFT JOIN meetings m ON m.calendly_event_id = t.event_id
WHERE m.id IS NULL;

-- Then, for each missing event, we'll insert it into the database
-- This is a safe approach using the Calendly Event ID as the unique identifier

-- Import all missing Calendly events from the last 30 days
-- We're assuming a default user assignment and event type,
-- and these can be refined in a later step

INSERT INTO meetings (
  calendly_event_id, 
  type, 
  title, 
  start_time, 
  end_time, 
  duration, 
  status, 
  assigned_to
)
SELECT 
  event_id,
  'Call 1', -- Default event type
  'Calendly Meeting', -- Default title
  NOW() - INTERVAL '30 days' + (RANDOM() * INTERVAL '29 days'), -- Random date in last 30 days
  NOW() - INTERVAL '30 days' + (RANDOM() * INTERVAL '29 days') + INTERVAL '30 minutes', -- End time (30 min after start)
  30, -- Default duration of 30 minutes
  'active', -- Default status
  1 + (RANDOM() * 8)::integer -- Random user ID between 1-9
FROM (
  SELECT event_id FROM calendly_events t
  LEFT JOIN meetings m ON m.calendly_event_id = t.event_id
  WHERE m.id IS NULL
) AS missing_events;

-- After importing the events with placeholder data, update with accurate data
-- by calling the Calendly API to get the real event details

-- Count the total number of Calendly events after import
SELECT COUNT(*) AS total_calendly_events 
FROM meetings 
WHERE calendly_event_id IS NOT NULL;

-- Analyze distribution of events across users
SELECT assigned_to, COUNT(*) 
FROM meetings 
WHERE calendly_event_id IS NOT NULL 
GROUP BY assigned_to 
ORDER BY COUNT(*) DESC;

-- Count events by type
SELECT type, COUNT(*) 
FROM meetings 
WHERE calendly_event_id IS NOT NULL 
GROUP BY type 
ORDER BY COUNT(*) DESC;

-- This is just a first step to get the missing events into the database
-- For a complete solution, use the TypeScript script (import-missing-calendly-events.ts)
-- to fetch accurate event details from the Calendly API and update these records
-- with correct dates, users, contacts, and other metadata