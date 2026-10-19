// Comprehensive End-to-End Test for SHS Science Hub Multiplayer (2 to 4 Players)
const BASE_URL = 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, data: await res.json() };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🔬 STARTING SHS SCIENCE HUB MULTIPLAYER E2E TEST SUITE (2–4 PLAYERS)');
  console.log('================================================================');

  // ==========================================================================
  // TEST SUITE 1: 2-PLAYER ROOM VALIDATION (SUBJECT → TOPIC → GAMEPLAY)
  // ==========================================================================
  console.log('\n>>> SUITE 1: 2-PLAYER ROOM & TOPIC SELECTION TEST');
  console.log('1.1 Player A creates a 2-player room with Subject & Topic...');
  const create2p = await post('/api/rooms/create', {
    hostName: 'HostAvatar',
    playerId: 'p1_host',
    subject: 'Physics',
    topic: 'Rectilinear Kinematics (Motion in a Straight Line)',
    difficulty: 'medium',
    questionCount: 1,
    timePerQuestion: 15,
  });

  if (!create2p.data.success || !create2p.data.code) {
    throw new Error(`Failed to create 2p room: ${JSON.stringify(create2p.data)}`);
  }
  const code2p = create2p.data.code;
  console.log(`✓ 2-Player Room Created! Code: [${code2p}], Topic: "${create2p.data.room.topic}"`);

  // Invalid code rejection
  console.log('1.2 Testing invalid room code rejection...');
  const invalidJoin = await post('/api/rooms/join', {
    code: 'INV999',
    playerName: 'Unknown',
    playerId: 'p_invalid',
  });
  if (invalidJoin.status !== 400 || invalidJoin.data.success !== false) {
    throw new Error(`Invalid code was not rejected: ${JSON.stringify(invalidJoin)}`);
  }
  console.log(`✓ Invalid code correctly rejected: "${invalidJoin.data.message}"`);

  // Player B joins
  console.log('1.3 Player B joining 2-player room...');
  const join2p = await post('/api/rooms/join', {
    code: code2p,
    playerName: 'ContenderKwame',
    playerId: 'p2_kwame',
  });
  if (!join2p.data.success || join2p.data.room.players.length !== 2) {
    throw new Error(`Player B failed to join: ${JSON.stringify(join2p.data)}`);
  }
  console.log(`✓ Player B joined! Lobby players (${join2p.data.room.players.length}): ${join2p.data.room.players.map((p) => p.name).join(', ')}`);

  // Ready and Start
  console.log('1.4 Player B readying up & Host starting game...');
  await post(`/api/rooms/${code2p}/ready`, { playerId: 'p2_kwame' });
  const start2p = await post(`/api/rooms/${code2p}/start`, { playerId: 'p1_host' });
  if (!start2p.data.success || start2p.data.room.status !== 'playing') {
    throw new Error(`Failed to start 2-player game: ${JSON.stringify(start2p.data)}`);
  }
  console.log(`✓ 2-Player Battle started! Status: "${start2p.data.room.status}"`);

  // Verify questions synchronization and answer security
  const state2pQ1 = await get(`/api/rooms/${code2p}`);
  const q1 = state2pQ1.data.room.currentQuestion;
  if (!q1 || !q1.question || q1.correctAnswer) {
    throw new Error('Question missing or leaked correct answer!');
  }
  console.log(`✓ Question synchronized and answer hidden from client: "${q1.question.substring(0, 50)}..."`);

  // Play question 0
  await post(`/api/rooms/${code2p}/answer`, { playerId: 'p1_host', questionIndex: 0, choice: 'A' });
  await post(`/api/rooms/${code2p}/answer`, { playerId: 'p2_kwame', questionIndex: 0, choice: 'B' });
  await sleep(3400); // wait for review auto-advance to finish

  // Verify final 2-player results
  const final2p = await get(`/api/rooms/${code2p}`);
  if (final2p.data.room.status !== 'finished') {
    throw new Error(`Expected finished game, got ${final2p.data.room.status}`);
  }
  const scores2p = final2p.data.room.finalResults.finalScores;
  if (scores2p.length !== 2) {
    throw new Error(`Expected exactly 2 ranked player positions, got ${scores2p.length}`);
  }
  console.log('✓ 2-Player Final Results Verified:');
  console.log(`  1st Place: ${scores2p[0].name} (${scores2p[0].score} pts, +${scores2p[0].xpEarned} XP)`);
  console.log(`  2nd Place: ${scores2p[1].name} (${scores2p[1].score} pts, +${scores2p[1].xpEarned} XP)`);

  // ==========================================================================
  // TEST SUITE 2: 3-PLAYER ROOM VALIDATION (ADDITIONAL MATH & LOGARITHMS)
  // ==========================================================================
  console.log('\n>>> SUITE 2: 3-PLAYER ROOM VALIDATION');
  console.log('2.1 Creating room with Additional Mathematics & Logarithms...');
  const create3p = await post('/api/rooms/create', {
    hostName: 'HostAma',
    playerId: 'p1_ama',
    subject: 'Additional Mathematics',
    topic: 'Logarithms & Exponential Equations',
    difficulty: 'hard',
    questionCount: 1,
    timePerQuestion: 15,
  });
  const code3p = create3p.data.code;
  console.log(`✓ Room created! Code: [${code3p}], Topic: "${create3p.data.room.topic}"`);

  console.log('2.2 Player 2 (Kofi) and Player 3 (Abena) joining...');
  const join3pP2 = await post('/api/rooms/join', {
    code: code3p,
    playerName: 'Kofi',
    playerId: 'p2_kofi',
  });
  if (!join3pP2.data.success) throw new Error('Player 2 failed to join 3p room');

  const join3pP3 = await post('/api/rooms/join', {
    code: code3p,
    playerName: 'Abena',
    playerId: 'p3_abena',
  });
  if (!join3pP3.data.success || join3pP3.data.room.players.length !== 3) {
    throw new Error(`Player 3 failed to join: ${JSON.stringify(join3pP3.data)}`);
  }
  console.log(`✓ All 3 players in lobby: ${join3pP3.data.room.players.map((p) => p.name).join(', ')}`);

  console.log('2.3 Testing start game blocker when not all 3 players are ready...');
  const blockedStart = await post(`/api/rooms/${code3p}/start`, { playerId: 'p1_ama' });
  if (blockedStart.data.success !== false) {
    throw new Error('Game started while players were not ready!');
  }
  console.log(`✓ Start correctly blocked: "${blockedStart.data.message}"`);

  console.log('2.4 Readying all players and starting 3-player battle...');
  await post(`/api/rooms/${code3p}/ready`, { playerId: 'p2_kofi' });
  await post(`/api/rooms/${code3p}/ready`, { playerId: 'p3_abena' });
  const start3p = await post(`/api/rooms/${code3p}/start`, { playerId: 'p1_ama' });
  if (!start3p.data.success || start3p.data.room.status !== 'playing') {
    throw new Error(`Failed to start 3-player game: ${JSON.stringify(start3p.data)}`);
  }
  console.log('✓ 3-Player Battle started successfully!');

  // Play question 0
  await post(`/api/rooms/${code3p}/answer`, { playerId: 'p1_ama', questionIndex: 0, choice: 'B' });
  await post(`/api/rooms/${code3p}/answer`, { playerId: 'p2_kofi', questionIndex: 0, choice: 'C' });
  await post(`/api/rooms/${code3p}/answer`, { playerId: 'p3_abena', questionIndex: 0, choice: 'A' });
  await sleep(3400);

  const final3p = await get(`/api/rooms/${code3p}`);
  if (final3p.data.room.status !== 'finished') {
    throw new Error(`Expected 3p game finished, got ${final3p.data.room.status}`);
  }
  const scores3p = final3p.data.room.finalResults.finalScores;
  if (scores3p.length !== 3) {
    throw new Error(`Expected 3 ranked positions, got ${scores3p.length}`);
  }
  console.log('✓ 3-Player Final Results Verified:');
  console.log(`  1st Place: ${scores3p[0].name} (${scores3p[0].score} pts, Rank ${scores3p[0].rank})`);
  console.log(`  2nd Place: ${scores3p[1].name} (${scores3p[1].score} pts, Rank ${scores3p[1].rank})`);
  console.log(`  3rd Place: ${scores3p[2].name} (${scores3p[2].score} pts, Rank ${scores3p[2].rank})`);

  // ==========================================================================
  // TEST SUITE 3: 4-PLAYER ROOM & 5TH PLAYER REJECTION VALIDATION
  // ==========================================================================
  console.log('\n>>> SUITE 3: 4-PLAYER ROOM & 5TH PLAYER REJECTION TEST');
  console.log('3.1 Host creates 4-player room in Chemistry...');
  const create4p = await post('/api/rooms/create', {
    hostName: 'HostYaw',
    playerId: 'p1_yaw',
    subject: 'Chemistry',
    topic: 'Hydrocarbons: Alkanes, Alkenes & Alkynes',
    difficulty: 'medium',
    questionCount: 1,
    timePerQuestion: 15,
  });
  const code4p = create4p.data.code;
  console.log(`✓ Room created! Code: [${code4p}]`);

  console.log('3.2 Player 2, 3, and 4 joining room...');
  await post('/api/rooms/join', { code: code4p, playerName: 'Akua', playerId: 'p2_akua' });
  await post('/api/rooms/join', { code: code4p, playerName: 'Esi', playerId: 'p3_esi' });
  const joinP4 = await post('/api/rooms/join', { code: code4p, playerName: 'Kojo', playerId: 'p4_kojo' });

  if (!joinP4.data.success || joinP4.data.room.players.length !== 4) {
    throw new Error(`Expected 4 players in room, got: ${JSON.stringify(joinP4.data)}`);
  }
  console.log(`✓ 4 Players now in lobby: ${joinP4.data.room.players.map((p) => p.name).join(', ')}`);

  console.log('3.3 CRITICAL: Testing 5th player rejection (Server hard 4-player maximum)...');
  const fifthPlayerJoin = await post('/api/rooms/join', {
    code: code4p,
    playerName: 'PlayerFiveExcess',
    playerId: 'p5_intruder',
  });

  if (fifthPlayerJoin.status !== 400 || fifthPlayerJoin.data.success !== false) {
    throw new Error(`SECURITY/SPEC VIOLATION: 5th player was not rejected by server! Response: ${JSON.stringify(fifthPlayerJoin)}`);
  }
  console.log(`✓ 5th player strictly rejected by server with status ${fifthPlayerJoin.status}: "${fifthPlayerJoin.data.message}"`);

  // Verify room still has exactly 4 players
  const verifyRoom4 = await get(`/api/rooms/${code4p}`);
  if (verifyRoom4.data.room.players.length !== 4) {
    throw new Error(`Room player count altered after 5th player rejection: ${verifyRoom4.data.room.players.length}`);
  }
  console.log('✓ Room integrity preserved: Exactly 4 players remain in lobby.');

  console.log('3.4 Readying all 4 players and starting 4-player battle...');
  await post(`/api/rooms/${code4p}/ready`, { playerId: 'p2_akua' });
  await post(`/api/rooms/${code4p}/ready`, { playerId: 'p3_esi' });
  await post(`/api/rooms/${code4p}/ready`, { playerId: 'p4_kojo' });
  const start4p = await post(`/api/rooms/${code4p}/start`, { playerId: 'p1_yaw' });
  if (!start4p.data.success || start4p.data.room.status !== 'playing') {
    throw new Error(`Failed to start 4-player game: ${JSON.stringify(start4p.data)}`);
  }
  console.log('✓ 4-Player Battle started!');

  // Play question 0
  await post(`/api/rooms/${code4p}/answer`, { playerId: 'p1_yaw', questionIndex: 0, choice: 'A' });
  await post(`/api/rooms/${code4p}/answer`, { playerId: 'p2_akua', questionIndex: 0, choice: 'B' });
  await post(`/api/rooms/${code4p}/answer`, { playerId: 'p3_esi', questionIndex: 0, choice: 'C' });
  await post(`/api/rooms/${code4p}/answer`, { playerId: 'p4_kojo', questionIndex: 0, choice: 'D' });
  await sleep(3400);

  const final4p = await get(`/api/rooms/${code4p}`);
  if (final4p.data.room.status !== 'finished') {
    throw new Error(`Expected 4p game finished, got ${final4p.data.room.status}`);
  }
  const scores4p = final4p.data.room.finalResults.finalScores;
  if (scores4p.length !== 4) {
    throw new Error(`Expected exactly 4 ranked positions, got ${scores4p.length}`);
  }
  console.log('✓ 4-Player Final Results Verified:');
  console.log(`  1st Place: ${scores4p[0].name} (${scores4p[0].score} pts, +${scores4p[0].xpEarned} XP)`);
  console.log(`  2nd Place: ${scores4p[1].name} (${scores4p[1].score} pts, +${scores4p[1].xpEarned} XP)`);
  console.log(`  3rd Place: ${scores4p[2].name} (${scores4p[2].score} pts, +${scores4p[2].xpEarned} XP)`);
  console.log(`  4th Place: ${scores4p[3].name} (${scores4p[3].score} pts, +${scores4p[3].xpEarned} XP)`);

  // Test Rematch in 4-player room
  console.log('3.5 Testing Rematch vote in 4-player room...');
  await post(`/api/rooms/${code4p}/rematch`, { playerId: 'p1_yaw' });
  const rematchRes = await post(`/api/rooms/${code4p}/rematch`, { playerId: 'p2_akua' });
  if (rematchRes.data.room.status !== 'lobby') {
    throw new Error(`Expected rematch to reset room to lobby, got ${rematchRes.data.room.status}`);
  }
  console.log('✓ Rematch successfully reset 4-player room to lobby with fresh questions!');

  console.log('\n================================================================');
  console.log('🎉 ALL 2-PLAYER, 3-PLAYER, AND 4-PLAYER E2E CHECKS PASSED PERFECTLY!');
  console.log('🛡️ 5TH PLAYER REJECTION VALIDATED STRICTLY BY THE SERVER!');
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
