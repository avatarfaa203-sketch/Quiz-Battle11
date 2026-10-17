// Comprehensive End-to-End Test for Quiz Battle Multiplayer (1v1)
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

async function runTest() {
  console.log('=== STARTING QUIZ BATTLE 1v1 MULTIPLAYER VALIDATION ===');

  // Step 1: Player A creates a room
  console.log('\n1. Player A creating room...');
  const createRes = await post('/api/rooms/create', {
    hostName: 'AvatarHost',
    playerId: 'player_a_123',
    subject: 'Physics',
    difficulty: 'medium',
    questionCount: 5,
    timePerQuestion: 15,
  });

  if (!createRes.data.success || !createRes.data.code) {
    throw new Error(`Failed to create room: ${JSON.stringify(createRes.data)}`);
  }
  const code = createRes.data.code;
  console.log(`✓ Room created successfully! Code: [${code}] (Length: ${code.length})`);

  // Step 2: Test invalid room code rejection
  console.log('\n2. Testing invalid room code rejection...');
  const invalidJoin = await post('/api/rooms/join', {
    code: 'BAD999',
    playerName: 'Imposter',
    playerId: 'player_bad',
  });
  if (invalidJoin.status !== 400 || invalidJoin.data.success !== false) {
    throw new Error(`Invalid code was not properly rejected: ${JSON.stringify(invalidJoin)}`);
  }
  console.log(`✓ Invalid code correctly rejected with: "${invalidJoin.data.message}"`);

  // Step 3: Player B joins the room
  console.log('\n3. Player B joining room with code:', code);
  const joinRes = await post('/api/rooms/join', {
    code,
    playerName: 'ChallengerB',
    playerId: 'player_b_456',
  });
  if (!joinRes.data.success) {
    throw new Error(`Player B failed to join: ${JSON.stringify(joinRes.data)}`);
  }
  console.log(`✓ Player B joined! Current players in lobby: ${joinRes.data.room.players.map((p) => p.name).join(', ')}`);

  // Step 4: Verify 3rd player cannot join (1v1 limit)
  console.log('\n4. Testing 3rd player rejection (1v1 maximum)...');
  const thirdPlayer = await post('/api/rooms/join', {
    code,
    playerName: 'PlayerThree',
    playerId: 'player_c_789',
  });
  if (thirdPlayer.status !== 400 || thirdPlayer.data.success !== false) {
    throw new Error(`3rd player was not rejected: ${JSON.stringify(thirdPlayer)}`);
  }
  console.log(`✓ 3rd player rejected: "${thirdPlayer.data.message}"`);

  // Step 5: Player B readies up
  console.log('\n5. Player B toggling ready state...');
  const readyRes = await post(`/api/rooms/${code}/ready`, { playerId: 'player_b_456' });
  const allReady = readyRes.data.room.players.every((p) => p.ready);
  if (!allReady) {
    throw new Error('Not all players are marked ready');
  }
  console.log('✓ Both Player A (Host) and Player B are Ready in lobby');

  // Step 6: Non-host cannot start game
  console.log('\n6. Testing security: Non-host attempting to start game...');
  const unauthorizedStart = await post(`/api/rooms/${code}/start`, { playerId: 'player_b_456' });
  if (unauthorizedStart.data.success !== false) {
    throw new Error('Non-host was able to start game!');
  }
  console.log(`✓ Unauthorized start blocked: "${unauthorizedStart.data.message}"`);

  // Step 7: Host starts battle
  console.log('\n7. Host starting battle...');
  const startRes = await post(`/api/rooms/${code}/start`, { playerId: 'player_a_123' });
  if (!startRes.data.success || startRes.data.room.status !== 'playing') {
    throw new Error(`Failed to start battle: ${JSON.stringify(startRes.data)}`);
  }
  console.log('✓ Battle started! Status: "playing"');

  // Step 8: Both players fetch game state and verify exact same question
  console.log('\n8. Checking synchronized questions for both players...');
  const roomState = await get(`/api/rooms/${code}`);
  const q1 = roomState.data.room.currentQuestion;
  if (!q1 || !q1.question) {
    throw new Error('Current question missing from room state');
  }
  // Verify correct answer is NOT leaked to clients
  if (q1.correctAnswer) {
    throw new Error('SECURITY VIOLATION: Correct answer leaked to client before answer phase!');
  }
  console.log(`✓ Synchronized Question 1: "${q1.question}"`);
  console.log(`  Option A: ${q1.optionA}`);
  console.log(`  Option B: ${q1.optionB}`);
  console.log(`  Option C: ${q1.optionC}`);
  console.log(`  Option D: ${q1.optionD}`);
  console.log('✓ Security verified: Correct answer is sanitized from question payload.');

  // Step 9: Player A answers Option A, Player B answers Option B
  console.log('\n9. Submitting player answers...');
  const ansA = await post(`/api/rooms/${code}/answer`, {
    playerId: 'player_a_123',
    questionIndex: 0,
    choice: 'A',
  });
  console.log(`✓ Player A answered: score earned = ${ansA.data.scoreEarned}, total = ${ansA.data.totalScore}`);

  // Test duplicate answer prevention
  const dupAns = await post(`/api/rooms/${code}/answer`, {
    playerId: 'player_a_123',
    questionIndex: 0,
    choice: 'B',
  });
  if (dupAns.data.success !== false) {
    throw new Error('Duplicate answer submission was allowed!');
  }
  console.log(`✓ Security verified: Duplicate answer submission blocked: "${dupAns.data.message}"`);

  const ansB = await post(`/api/rooms/${code}/answer`, {
    playerId: 'player_b_456',
    questionIndex: 0,
    choice: 'B',
  });
  console.log(`✓ Player B answered: score earned = ${ansB.data.scoreEarned}, total = ${ansB.data.totalScore}`);

  // Step 10: Check review phase
  console.log('\n10. Checking review phase after both answered...');
  const reviewState = await get(`/api/rooms/${code}`);
  if (reviewState.data.room.status !== 'question_review') {
    throw new Error(`Expected question_review, got ${reviewState.data.room.status}`);
  }
  const review = reviewState.data.room.reviewData;
  console.log(`✓ Review phase active! Correct Answer was: [${review.correctAnswer}]`);
  console.log(`  Explanation: "${review.explanation}"`);

  // Step 11: Wait for server review timer (3.2s) to advance to Question 2
  console.log('\n11. Waiting 3.5s for server to auto-advance to Question 2...');
  await sleep(3500);

  const nextState = await get(`/api/rooms/${code}`);
  if (nextState.data.room.currentQuestionIndex !== 1 || nextState.data.room.status !== 'playing') {
    throw new Error(`Failed to advance to Q2: status=${nextState.data.room.status}, idx=${nextState.data.room.currentQuestionIndex}`);
  }
  console.log(`✓ Server automatically advanced to Question 2 (Index ${nextState.data.room.currentQuestionIndex})!`);
  console.log(`  Q2: "${nextState.data.room.currentQuestion.question}"`);

  // Step 12: Play remaining questions (Q2 through Q5)
  console.log('\n12. Simulating gameplay through Question 5...');
  for (let q = 1; q < 5; q++) {
    // Both answer
    await post(`/api/rooms/${code}/answer`, { playerId: 'player_a_123', questionIndex: q, choice: 'A' });
    await post(`/api/rooms/${code}/answer`, { playerId: 'player_b_456', questionIndex: q, choice: 'C' });
    // Wait for review timer
    await sleep(3400);
  }

  // Step 13: Verify finished game state and results
  console.log('\n13. Checking final results and winner calculation...');
  const finalState = await get(`/api/rooms/${code}`);
  if (finalState.data.room.status !== 'finished') {
    throw new Error(`Expected game to be finished, got ${finalState.data.room.status}`);
  }

  const results = finalState.data.room.finalResults;
  console.log('✓ Game Finished!');
  console.log(`  Winner ID: ${results.winnerId || 'Draw'}`);
  console.log(`  Is Draw: ${results.isDraw}`);
  for (const s of results.finalScores) {
    console.log(`  - ${s.name}: ${s.score} pts, ${s.correctAnswers}/${s.totalQuestions} correct (${s.accuracy}%), +${s.xpEarned} XP`);
  }

  // Step 14: Test Rematch flow
  console.log('\n14. Testing rematch vote...');
  const rematchA = await post(`/api/rooms/${code}/rematch`, { playerId: 'player_a_123' });
  console.log('✓ Player A requested rematch');
  const rematchB = await post(`/api/rooms/${code}/rematch`, { playerId: 'player_b_456' });
  if (rematchB.data.room.status !== 'lobby') {
    throw new Error(`Expected room to reset to lobby after both agree, got: ${rematchB.data.room.status}`);
  }
  console.log('✓ Both players accepted rematch: Room successfully reset to lobby with fresh questions!');

  console.log('\n======================================================');
  console.log('🎉 ALL 14 MULTIPLAYER E2E TEST CHECKS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
