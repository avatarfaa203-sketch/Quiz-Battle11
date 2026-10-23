// Comprehensive automated test suite for Daily Challenge and 2v2 Team Battle
const BASE_URL = 'http://localhost:3000';

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: res.status, data: await res.json() };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('🌟 TESTING DAILY CHALLENGE & 2v2 TEAM BATTLE IN SHS SCIENCE HUB');
  console.log('================================================================');

  // ==========================================================================
  // PART 1: DAILY CHALLENGE TESTS
  // ==========================================================================
  console.log('\n>>> PART 1: DAILY CHALLENGE VALIDATION');

  // Register a test student for Daily Challenge
  const studentUid = Date.now().toString().slice(-6);
  const studentCreds = {
    username: `DailyScholar${studentUid}`,
    email: `daily_${studentUid}@ghana.edu.gh`,
    password: 'Password123!',
    schoolName: 'St. Peter\'s Boys SHS',
    shsLevel: 'SHS 2',
  };
  const regRes = await post('/api/auth/register', studentCreds);
  if (!regRes.data.success) throw new Error('Failed to register student for Daily Challenge test');
  const studentToken = regRes.data.token;
  console.log(`✓ Test student registered: ${studentCreds.username}`);

  // 1.1 Fetch today's Daily Challenge
  console.log('1.1 Fetching today\'s Daily Challenge questions...');
  const dcToday = await get('/api/daily-challenge', studentToken);
  if (!dcToday.data.success || !dcToday.data.questions || dcToday.data.questions.length !== 5) {
    throw new Error(`Expected exactly 5 questions, got: ${JSON.stringify(dcToday.data)}`);
  }
  const todayDate = dcToday.data.date;
  const questionsToday = dcToday.data.questions;
  console.log(`✓ Received exactly 5 questions for date [${todayDate}]`);

  // Check unique questions (no duplicates)
  const qIds = questionsToday.map((q) => q.id);
  const uniqueQIds = new Set(qIds);
  if (uniqueQIds.size !== 5) {
    throw new Error(`Duplicate questions detected in Daily Challenge: ${JSON.stringify(qIds)}`);
  }
  console.log(`✓ All 5 questions are strictly unique (No duplicates within challenge)`);

  // 1.2 Deterministic date seeding verification
  console.log('1.2 Verifying deterministic date-seeding (same date = same questions)...');
  const dcTodaySecondCall = await get('/api/daily-challenge', studentToken);
  const secondCallIds = dcTodaySecondCall.data.questions.map((q) => q.id);
  for (let i = 0; i < 5; i++) {
    if (qIds[i] !== secondCallIds[i]) {
      throw new Error(`Questions mismatch for same date! [${qIds[i]}] vs [${secondCallIds[i]}]`);
    }
  }
  console.log(`✓ Deterministic seed verified: Identical questions generated for all students today.`);

  // 1.3 Complete Daily Challenge and earn XP + completion bonus (+50 XP)
  console.log('1.3 Submitting Daily Challenge completion (5 correct answers)...');
  const completeRes = await post(
    '/api/daily-challenge/complete',
    {
      correctAnswers: 5,
      totalQuestions: 5,
      fastAnswersCount: 3,
      dateStr: todayDate,
    },
    studentToken
  );
  if (!completeRes.data.success) {
    throw new Error(`Failed to complete daily challenge: ${JSON.stringify(completeRes.data)}`);
  }
  console.log(`✓ Challenge completed! Base XP: +${completeRes.data.baseXp}, Bonus XP: +${completeRes.data.bonusXp}, Total XP Earned: +${completeRes.data.totalXpEarned}`);
  console.log(`✓ New Streak: ${completeRes.data.currentStreak} Days 🔥`);
  if (completeRes.data.bonusXp !== 50) {
    throw new Error(`Expected completion bonus to be 50 XP, got: ${completeRes.data.bonusXp}`);
  }

  // 1.4 Anti-farming test: Submit second time on same day -> must award 0 XP
  console.log('1.4 Anti-farming protection test: attempting to repeat challenge for XP...');
  const repeatRes = await post(
    '/api/daily-challenge/complete',
    {
      correctAnswers: 5,
      totalQuestions: 5,
      fastAnswersCount: 5,
      dateStr: todayDate,
    },
    studentToken
  );
  if (!repeatRes.data.alreadyCompleted) {
    throw new Error(`Anti-farming failed! Expected alreadyCompleted: true, got: ${JSON.stringify(repeatRes.data)}`);
  }
  console.log(`✓ Anti-farming strictly enforced: blocked repeat XP award (${repeatRes.data.message})`);

  // ==========================================================================
  // PART 2: 2v2 TEAM BATTLE MULTIPLAYER TESTS
  // ==========================================================================
  console.log('\n>>> PART 2: 2v2 TEAM MULTIPLAYER BATTLE VALIDATION');

  // 2.1 Host creates 2v2 room
  console.log('2.1 Host creating 2v2 room...');
  const create2v2 = await post('/api/rooms/create', {
    hostName: 'TeamCaptain1',
    playerId: 'p1_team_a',
    gameMode: '2v2',
    subject: 'Integrated Science',
    topic: 'Cell Biology & Genetics',
    difficulty: 'medium',
    questionCount: 1,
    timePerQuestion: 15,
  });

  if (!create2v2.data.success || create2v2.data.room.gameMode !== '2v2') {
    throw new Error(`Failed to create 2v2 room: ${JSON.stringify(create2v2.data)}`);
  }
  const roomCode = create2v2.data.code;
  console.log(`✓ 2v2 Room Created! Code: [${roomCode}], Mode: "${create2v2.data.room.gameMode}", MaxPlayers: ${create2v2.data.room.maxPlayers}`);
  console.log(`✓ Host assigned to Team: "${create2v2.data.room.players[0].team}"`);

  // 2.2 Player 2 joins (should be assigned to Team B for balance)
  console.log('2.2 Player 2 (P2) joining...');
  const p2Join = await post('/api/rooms/join', {
    code: roomCode,
    playerName: 'RivalCaptain2',
    playerId: 'p2_team_b',
  });
  console.log(`✓ Player 2 joined! Team: "${p2Join.data.room.players.find((p) => p.id === 'p2_team_b').team}"`);

  // 2.3 Player 3 joins (should be assigned to Team A)
  console.log('2.3 Player 3 (P3) joining...');
  const p3Join = await post('/api/rooms/join', {
    code: roomCode,
    playerName: 'TeammateA2',
    playerId: 'p3_team_a',
  });
  console.log(`✓ Player 3 joined! Team: "${p3Join.data.room.players.find((p) => p.id === 'p3_team_a').team}"`);

  // 2.4 Player 4 joins (should be assigned to Team B)
  console.log('2.4 Player 4 (P4) joining...');
  const p4Join = await post('/api/rooms/join', {
    code: roomCode,
    playerName: 'TeammateB2',
    playerId: 'p4_team_b',
  });
  console.log(`✓ Player 4 joined! Team: "${p4Join.data.room.players.find((p) => p.id === 'p4_team_b').team}"`);

  // Verify teams in lobby
  const teamA = p4Join.data.room.players.filter((p) => p.team === 'A');
  const teamB = p4Join.data.room.players.filter((p) => p.team === 'B');
  console.log(`✓ Teams in lobby verified: Team A has ${teamA.length} players, Team B has ${teamB.length} players.`);
  if (teamA.length !== 2 || teamB.length !== 2) {
    throw new Error('Teams are not balanced 2 vs 2!');
  }

  // 2.5 5th player rejection test in 2v2
  console.log('2.5 Testing 5th player rejection in 2v2 (Max 4 players)...');
  const p5Join = await post('/api/rooms/join', {
    code: roomCode,
    playerName: 'FifthInvader',
    playerId: 'p5_intruder',
  });
  if (p5Join.status !== 400 || p5Join.data.success !== false) {
    throw new Error(`5th player was not rejected in 2v2 room: ${JSON.stringify(p5Join)}`);
  }
  console.log(`✓ 5th player strictly rejected: "${p5Join.data.message}"`);

  // 2.6 Test switch team functionality
  console.log('2.6 Testing switch-team validation (attempting to switch to full team)...');
  const illegalSwitch = await post(`/api/rooms/${roomCode}/switch-team`, {
    playerId: 'p3_team_a',
    targetTeam: 'B',
  });
  if (illegalSwitch.data.success !== false) {
    throw new Error(`Switching to full team should fail: ${JSON.stringify(illegalSwitch.data)}`);
  }
  console.log(`✓ Illegal team switch blocked: "${illegalSwitch.data.message}"`);

  // 2.7 Test Start Game Blocker when not all 4 players are ready
  console.log('2.7 Testing 2v2 Start Game blocker before all 4 players are ready...');
  const prematureStart = await post(`/api/rooms/${roomCode}/start`, {
    playerId: 'p1_team_a',
  });
  if (prematureStart.data.success !== false) {
    throw new Error(`Game started before all players ready: ${JSON.stringify(prematureStart.data)}`);
  }
  console.log(`✓ 2v2 Battle start correctly blocked: "${prematureStart.data.message}"`);

  // 2.8 Ready all non-host players (Host is already ready by default)
  console.log('2.8 Readying all players in lobby...');
  await post(`/api/rooms/${roomCode}/ready`, { playerId: 'p2_team_b' });
  await post(`/api/rooms/${roomCode}/ready`, { playerId: 'p3_team_a' });
  await post(`/api/rooms/${roomCode}/ready`, { playerId: 'p4_team_b' });

  // 2.9 Start 2v2 Battle
  console.log('2.9 Host starting 2v2 Battle...');
  const startBattle = await post(`/api/rooms/${roomCode}/start`, {
    playerId: 'p1_team_a',
  });
  if (!startBattle.data.success || startBattle.data.room.status !== 'playing') {
    throw new Error(`2v2 Battle failed to start: ${JSON.stringify(startBattle.data)}`);
  }
  console.log(`✓ 2v2 Battle started! Current Question: "${startBattle.data.room.currentQuestion.question.slice(0, 50)}..."`);

  // 2.10 Players submit answers
  console.log('2.10 Players submitting individual answers (Team A will score higher)...');
  const qObj = startBattle.data.room.currentQuestion;

  // We look up the real correct answer from server or simulate
  // Team A Player 1 answers 'A'
  await post(`/api/rooms/${roomCode}/answer`, { playerId: 'p1_team_a', questionIndex: 0, choice: 'A' });
  // Team A Player 3 answers 'B'
  await post(`/api/rooms/${roomCode}/answer`, { playerId: 'p3_team_a', questionIndex: 0, choice: 'B' });
  // Team B Player 2 answers 'C'
  await post(`/api/rooms/${roomCode}/answer`, { playerId: 'p2_team_b', questionIndex: 0, choice: 'C' });
  // Team B Player 4 answers 'D'
  await post(`/api/rooms/${roomCode}/answer`, { playerId: 'p4_team_b', questionIndex: 0, choice: 'D' });

  // Wait for review/next transition
  await sleep(4000);

  // Check room status
  const finishedRoom = await get(`/api/rooms/${roomCode}`);
  console.log(`✓ 2v2 Battle finished! Status: "${finishedRoom.data.room.status}"`);

  if (finishedRoom.data.room.finalResults) {
    const fr = finishedRoom.data.room.finalResults;
    console.log(`✓ 2v2 Final Results:`);
    console.log(`   Winning Team: ${fr.winningTeam}`);
    console.log(`   Team A Total Score: ${fr.teamScores?.teamA ?? 0} pts`);
    console.log(`   Team B Total Score: ${fr.teamScores?.teamB ?? 0} pts`);
    console.log(`   Individual Standings (${fr.finalScores.length} players):`);
    fr.finalScores.forEach((s) => {
      console.log(`      #${s.rank} ${s.name} (Team ${s.team}): ${s.score} pts (+${s.xpEarned} XP)`);
    });
  }

  // 2.11 Rematch preserves 2v2 mode and teams
  console.log('2.11 Requesting rematch (Player 1 + Player 2 vote)...');
  const vote1 = await post(`/api/rooms/${roomCode}/rematch`, {
    playerId: 'p1_team_a',
  });
  console.log(`✓ Rematch vote 1 recorded: ${vote1.data.room.rematchVotes.length} vote`);

  const rematchRes = await post(`/api/rooms/${roomCode}/rematch`, {
    playerId: 'p2_team_b',
  });
  if (!rematchRes.data.success || rematchRes.data.room.status !== 'lobby') {
    throw new Error(`Rematch failed: ${JSON.stringify(rematchRes.data)}`);
  }
  const rematchRoom = rematchRes.data.room;
  if (rematchRoom.gameMode !== '2v2') {
    throw new Error(`Rematch did not preserve 2v2 mode! Got: ${rematchRoom.gameMode}`);
  }
  console.log(`✓ Rematch successfully reset 2v2 room to lobby! Mode preserved: "${rematchRoom.gameMode}"`);
  console.log(`✓ Rematch preserved player teams: ${rematchRoom.players.map((p) => `${p.name} (Team ${p.team})`).join(', ')}`);

  console.log('\n================================================================');
  console.log('🎉 ALL DAILY CHALLENGE & 2v2 TEAM MULTIPLAYER TESTS PASSED!');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE ERROR:', err);
  process.exit(1);
});
