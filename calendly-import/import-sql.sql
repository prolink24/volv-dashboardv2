-- SQL to import missing Calendly events
-- Generated at 2025-05-20T21:36:39.714Z

-- Check for duplicate Calendly events
SELECT calendly_event_id, COUNT(*) 
FROM meetings 
WHERE calendly_event_id IS NOT NULL 
GROUP BY calendly_event_id 
HAVING COUNT(*) > 1;


-- Most Recent events (2025-04-20T21:36:39.715Z to 2025-05-20T21:36:39.715Z)

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  'a083f101-590a-4dd9-a056-c4a5facd08fc', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T14:30:00.000Z', '2025-04-21T14:45:00.000Z', 15, 'active',
  '2025-04-20T14:20:56.967Z', 1, 
  'abelsencion@burgeonassetmgmt.com', 
  'Abel Sencion'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = 'a083f101-590a-4dd9-a056-c4a5facd08fc'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  'f6342598-c49e-41ee-9c47-8cca99857abc', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T16:00:00.000Z', '2025-04-21T16:15:00.000Z', 15, 'active',
  '2025-04-20T18:12:45.317Z', 1, 
  'mitchell@mtli.ca', 
  'Mitchell Learning'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = 'f6342598-c49e-41ee-9c47-8cca99857abc'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '378bef2b-6bc7-408c-aff4-820f7e94c517', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T17:00:00.000Z', '2025-04-21T17:15:00.000Z', 15, 'active',
  '2025-04-20T11:18:39.079Z', 1, 
  'amigo82@gmail.com', 
  'Amit'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '378bef2b-6bc7-408c-aff4-820f7e94c517'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '866630dc-5002-4627-8a5f-c235d52cf5aa', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T18:00:00.000Z', '2025-04-21T18:15:00.000Z', 15, 'active',
  '2025-04-20T07:33:44.791Z', 2, 
  'renee.ross@gmail.com', 
  'Renee '
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '866630dc-5002-4627-8a5f-c235d52cf5aa'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '31f77584-6265-4c9c-bc14-b6c487981906', 'Calendly Meeting', 'Dealmaker | Apprentice Call',
  '2025-04-21T18:15:00.000Z', '2025-04-21T18:30:00.000Z', 15, 'active',
  '2025-04-19T16:18:00.891Z', 2, 
  'farhanrahat9841@gmail.com', 
  'Farhan Sayed'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '31f77584-6265-4c9c-bc14-b6c487981906'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '3d1137a8-6efc-4b6f-a8d3-c692ca9cc0e2', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T18:30:00.000Z', '2025-04-21T18:45:00.000Z', 15, 'active',
  '2025-04-20T07:31:45.671Z', 1, 
  'renee.ross@gmail.com', 
  'Renee'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '3d1137a8-6efc-4b6f-a8d3-c692ca9cc0e2'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '1fbdc56c-a0d2-4363-8396-ed623e112d7f', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T19:00:00.000Z', '2025-04-21T19:15:00.000Z', 15, 'active',
  '2025-04-20T07:25:40.479Z', 1, 
  'jameswalter@goldenpathwayfinancial.com', 
  'James Walter'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '1fbdc56c-a0d2-4363-8396-ed623e112d7f'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '22fd5b86-1115-4190-8d69-f42d3189a50c', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T20:00:00.000Z', '2025-04-21T20:15:00.000Z', 15, 'active',
  '2025-04-20T05:19:45.553Z', 1, 
  'adrian.plugged@gmail.com', 
  'Aj Tay'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '22fd5b86-1115-4190-8d69-f42d3189a50c'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '2ec4665c-0f3a-4ba5-af9f-6ec58f639594', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T22:30:00.000Z', '2025-04-21T22:45:00.000Z', 15, 'active',
  '2025-04-21T12:42:56.309Z', 2, 
  'jmfjwi@gmail.com', 
  'M F'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '2ec4665c-0f3a-4ba5-af9f-6ec58f639594'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '343ac0c4-783e-42c5-8fe0-bd7022b40966', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T23:00:00.000Z', '2025-04-21T23:15:00.000Z', 15, 'active',
  '2025-04-21T00:11:31.981Z', 2, 
  'ammar@ammarelm.com', 
  'Ammar Elmahalawy'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '343ac0c4-783e-42c5-8fe0-bd7022b40966'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '9c194112-93e0-4be4-9c2f-019b6fdbf2fe', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-21T23:30:00.000Z', '2025-04-21T23:45:00.000Z', 15, 'active',
  '2025-04-21T03:31:01.970Z', 2, 
  'anujjkalra@houzing.ca', 
  'Anuj Kalra'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '9c194112-93e0-4be4-9c2f-019b6fdbf2fe'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '45c176fb-4cf9-47c6-bf65-dd7ab35ef209', 'Calendly Meeting', 'Dealmaker | Apprentice Call',
  '2025-04-22T12:00:00.000Z', '2025-04-22T12:15:00.000Z', 15, 'active',
  '2025-04-21T21:41:08.357Z', 1, 
  'henryfortunatow@gmail.com', 
  'Henry Fortunatow'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '45c176fb-4cf9-47c6-bf65-dd7ab35ef209'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  'bd4d66d2-1b51-45d9-abe5-59fa1d2368bf', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-22T15:00:00.000Z', '2025-04-22T15:15:00.000Z', 15, 'active',
  '2025-04-20T01:56:16.465Z', 1, 
  'capitalperformancepartners@gmail.com', 
  'Tim Crowder'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = 'bd4d66d2-1b51-45d9-abe5-59fa1d2368bf'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '84bf3924-9d26-4bcd-8f06-dc30b64e788b', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-22T15:00:00.000Z', '2025-04-22T15:15:00.000Z', 15, 'active',
  '2025-04-21T17:50:58.557Z', 1, 
  'eastwood.blake@gmail.com', 
  'Blake Eastwood'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '84bf3924-9d26-4bcd-8f06-dc30b64e788b'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '60b5f6dd-d554-47ba-a895-63f439dffdf2', 'Calendly Meeting', 'Dealmaker | Apprentice Call',
  '2025-04-22T15:45:00.000Z', '2025-04-22T16:00:00.000Z', 15, 'active',
  '2025-04-22T11:41:56.718Z', 1, 
  'ivanacuna13@gmail.com', 
  'Ivan Acuna'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '60b5f6dd-d554-47ba-a895-63f439dffdf2'
);

INSERT INTO meetings (
  calendly_event_id, type, title, 
  start_time, end_time, duration, status, 
  booked_at, assigned_to, contact_email, contact_name
) 
SELECT 
  '0912d578-f3f4-46b9-b91b-a7ae413b28e4', 'Call 1', 'Dealmaker | Introduction Call',
  '2025-04-22T17:00:00.000Z', '2025-04-22T17:15:00.000Z', 15, 'active',
  '2025-04-20T02:29:58.458Z', 1, 
  'haseebch2020@gmail.com', 
  'Haseeb'
WHERE NOT EXISTS (
  SELECT 1 FROM meetings 
  WHERE calendly_event_id = '0912d578-f3f4-46b9-b91b-a7ae413b28e4'
);
