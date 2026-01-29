
-- Hard delete test tickets and their related data
-- Ticket IDs: 03dda0f9-f3e8-4376-a00e-46694932cdca, 32c78361-2af4-4281-89d3-73d5a49a9bf2

-- Delete attachments first (foreign key constraint)
DELETE FROM ticket_attachments WHERE ticket_id IN (
  '03dda0f9-f3e8-4376-a00e-46694932cdca',
  '32c78361-2af4-4281-89d3-73d5a49a9bf2'
);

-- Delete messages (foreign key constraint)
DELETE FROM ticket_messages WHERE ticket_id IN (
  '03dda0f9-f3e8-4376-a00e-46694932cdca',
  '32c78361-2af4-4281-89d3-73d5a49a9bf2'
);

-- Delete the tickets
DELETE FROM tickets WHERE id IN (
  '03dda0f9-f3e8-4376-a00e-46694932cdca',
  '32c78361-2af4-4281-89d3-73d5a49a9bf2'
);
