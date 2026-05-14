function normalizeId(value) {
  return String(value ?? '').trim();
}

function findUser(users, userId) {
  const normalizedId = normalizeId(userId);
  return users.find((user) => normalizeId(user.id) === normalizedId) || null;
}

function findRoom(rooms, roomId) {
  const normalizedId = normalizeId(roomId);
  return (Array.isArray(rooms) ? rooms : []).find((room) => normalizeId(room.id) === normalizedId) || null;
}

function normalizeMemberIds(memberIds) {
  return Array.from(new Set(
    (Array.isArray(memberIds) ? memberIds : [])
      .map(normalizeId)
      .filter((userId) => userId !== '')
  ));
}

function resolveRecipients(payload, users, rooms = []) {
  const senderId = normalizeId(payload.senderId);
  const room = findRoom(rooms, payload.roomId);

  if (room) {
    return normalizeMemberIds(room.memberIds)
      .filter((userId) => userId !== senderId && findUser(users, userId) !== null);
  }

  if (payload.allStudents === true) {
    return users
      .map((user) => normalizeId(user.id))
      .filter((userId) => userId !== senderId);
  }

  const uniqueIds = new Set(
    (Array.isArray(payload.recipientIds) ? payload.recipientIds : [])
      .map(normalizeId)
      .filter((userId) => userId !== '' && userId !== senderId)
  );

  return Array.from(uniqueIds).filter((userId) => findUser(users, userId) !== null);
}

function buildChatMessage(payload, users, rooms = []) {
  const senderId = normalizeId(payload.senderId);
  const sender = findUser(users, senderId);
  const room = findRoom(rooms, payload.roomId);

  if (!sender) {
    throw new Error('Unknown sender');
  }

  if (payload.roomId && !room) {
    throw new Error('Unknown room');
  }

  if (room && !normalizeMemberIds(room.memberIds).includes(senderId)) {
    throw new Error('Sender is not a room member');
  }

  const text = String(payload.text ?? '').trim();
  if (text === '') {
    throw new Error('Message text is required');
  }

  const recipientIds = resolveRecipients(payload, users, rooms);
  if (recipientIds.length === 0) {
    throw new Error('No valid recipients');
  }

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    senderId,
    senderName: sender.name,
    roomId: room ? normalizeId(room.id) : null,
    recipientIds,
    allStudents: payload.allStudents === true,
    text,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

function addRoomMember(room, userId, users) {
  const normalizedUserId = normalizeId(userId);
  if (!findUser(users, normalizedUserId)) {
    throw new Error('Unknown user');
  }

  return {
    ...room,
    memberIds: normalizeMemberIds([...(room.memberIds || []), normalizedUserId]),
  };
}

function removeRoomMember(room, userId) {
  const normalizedUserId = normalizeId(userId);
  return {
    ...room,
    memberIds: normalizeMemberIds(room.memberIds)
      .filter((memberId) => memberId !== normalizedUserId),
  };
}

function slugifyRoomName(name) {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'room';
}

function createRoom(payload, users, rooms = []) {
  const name = String(payload?.name ?? '').trim();
  if (name === '') {
    throw new Error('Room name is required');
  }

  const creatorId = normalizeId(payload?.creatorId);
  if (!findUser(users, creatorId)) {
    throw new Error('Unknown creator');
  }

  const memberIds = normalizeMemberIds([creatorId, ...(payload?.memberIds || [])])
    .filter((memberId) => findUser(users, memberId) !== null);

  if (!memberIds.includes(creatorId)) {
    memberIds.unshift(creatorId);
  }

  let id = `room-${slugifyRoomName(name)}`;
  let suffix = 2;
  while (findRoom(rooms, id)) {
    id = `room-${slugifyRoomName(name)}-${suffix}`;
    suffix += 1;
  }

  return {
    id,
    name,
    memberIds,
  };
}

module.exports = {
  addRoomMember,
  buildChatMessage,
  createRoom,
  findRoom,
  removeRoomMember,
  resolveRecipients,
};
