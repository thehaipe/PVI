const assert = require('assert');

const {
  buildChatMessage,
  addRoomMember,
  createRoom,
  resolveRecipients,
  removeRoomMember,
} = require('../chat-server-logic');

const users = [
  { id: '1', name: 'James Bond', online: true },
  { id: '2', name: 'Valentyn Miedientsov', online: true },
  { id: '3', name: 'Anna Smith', online: false },
  { id: '4', name: 'John Doe', online: true },
];

const rooms = [
  { id: 'lab', name: 'Lab Team', memberIds: ['1', '2', '3'] },
  { id: 'support', name: 'Support', memberIds: ['1', '4'] },
];

assert.deepStrictEqual(
  resolveRecipients({ senderId: '1', recipientIds: ['2'], allStudents: false }, users),
  ['2'],
  'single-recipient messages should go only to the selected student'
);

assert.deepStrictEqual(
  resolveRecipients({ senderId: '1', recipientIds: [], allStudents: true }, users),
  ['2', '3', '4'],
  'broadcast messages should go to every student except the sender'
);

const message = buildChatMessage({
  senderId: '1',
  recipientIds: ['2'],
  allStudents: false,
  text: 'Hello from the lab',
}, users);

assert.strictEqual(message.senderId, '1');
assert.deepStrictEqual(message.recipientIds, ['2']);
assert.strictEqual(message.allStudents, false);
assert.strictEqual(message.read, false);
assert.strictEqual(message.text, 'Hello from the lab');

assert.throws(
  () => buildChatMessage({ senderId: '1', recipientIds: ['9'], allStudents: false, text: 'Hi' }, users),
  /No valid recipients/,
  'messages without valid recipients should be rejected'
);

assert.deepStrictEqual(
  resolveRecipients({ senderId: '1', roomId: 'lab', text: 'Room ping' }, users, rooms),
  ['2', '3'],
  'room messages should go to every room member except the sender'
);

const roomMessage = buildChatMessage({
  senderId: '1',
  roomId: 'lab',
  text: 'Hello room',
}, users, rooms);

assert.strictEqual(roomMessage.roomId, 'lab');
assert.deepStrictEqual(roomMessage.recipientIds, ['2', '3']);

assert.deepStrictEqual(
  addRoomMember(rooms[0], '4', users).memberIds,
  ['1', '2', '3', '4'],
  'adding a valid member should append them once'
);

assert.deepStrictEqual(
  addRoomMember(rooms[0], '2', users).memberIds,
  ['1', '2', '3'],
  'adding an existing member should not duplicate them'
);

assert.deepStrictEqual(
  removeRoomMember(rooms[0], '2').memberIds,
  ['1', '3'],
  'removing a member should keep the remaining room members'
);

const createdRoom = createRoom({
  name: 'New Lab Room',
  creatorId: '1',
  memberIds: ['2', '3'],
}, users, rooms);

assert.strictEqual(createdRoom.name, 'New Lab Room');
assert.ok(createdRoom.id.startsWith('room-'), 'created room should receive generated id');
assert.deepStrictEqual(
  createdRoom.memberIds,
  ['1', '2', '3'],
  'created room should include creator and selected members'
);

console.log('chat server logic OK');
