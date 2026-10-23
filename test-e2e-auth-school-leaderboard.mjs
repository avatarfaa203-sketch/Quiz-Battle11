// End-to-End Validation Script for Authentication, School Challenge & Leaderboards
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

async function put(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
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

async function runAuthAndSchoolTests() {
  console.log('================================================================');
  console.log('🧪 TESTING COMPULSORY AUTH, USERNAME UNIQUENESS & SCHOOL CHALLENGE');
  console.log('================================================================');

  const uid = Date.now().toString().slice(-6);
  const testUser1 = {
    username: `Akosua${uid}`,
    email: `akosua${uid}@achimota.edu.gh`,
    password: 'Password123!',
    schoolName: 'Achimota School',
    shsLevel: 'SHS 2',
  };

  // 1. Test registration with missing/invalid school name
  console.log('\n>>> 1. Testing Compulsory School Name validation on Registration...');
  const regNoSchool = await post('/api/auth/register', {
    ...testUser1,
    schoolName: '',
  });
  if (regNoSchool.status !== 400 || !regNoSchool.data.message.includes('Senior High School name')) {
    throw new Error(`Empty school name was not rejected: ${JSON.stringify(regNoSchool)}`);
  }
  console.log(`✓ Empty school name correctly rejected: "${regNoSchool.data.message}"`);

  const regWhitespaceSchool = await post('/api/auth/register', {
    ...testUser1,
    schoolName: '   ',
  });
  if (regWhitespaceSchool.status !== 400) {
    throw new Error(`Whitespace-only school name was not rejected: ${JSON.stringify(regWhitespaceSchool)}`);
  }
  console.log(`✓ Whitespace school name correctly rejected.`);

  // 2. Test successful registration
  console.log('\n>>> 2. Testing Registration with valid username & school name...');
  const reg1 = await post('/api/auth/register', testUser1);
  if (reg1.status !== 201 || !reg1.data.success || !reg1.data.token) {
    throw new Error(`Registration failed: ${JSON.stringify(reg1.data)}`);
  }
  console.log(`✓ Registration succeeded! Student: ${reg1.data.user.username}, School: "${reg1.data.user.schoolName}"`);
  const token1 = reg1.data.token;

  // 3. Test existing username rejection
  console.log('\n>>> 3. Testing Existing Username detection and uniqueness...');
  const regDuplicateUsername = await post('/api/auth/register', {
    username: testUser1.username.toLowerCase(), // case-insensitive duplicate check
    email: `another_${uid}@school.edu.gh`,
    password: 'Password123!',
    schoolName: 'Prempeh College',
  });
  if (
    regDuplicateUsername.status !== 400 ||
    regDuplicateUsername.data.message !== 'Username already exists. Please choose another username.'
  ) {
    throw new Error(`Duplicate username was not rejected with exact expected message: ${JSON.stringify(regDuplicateUsername)}`);
  }
  console.log(`✓ Duplicate username strictly rejected: "${regDuplicateUsername.data.message}"`);

  // 4. Test existing user login and data retention
  console.log('\n>>> 4. Testing Sign-In with existing credentials and data retention...');
  const loginRes = await post('/api/auth/login', {
    identifier: testUser1.username,
    password: testUser1.password,
  });
  if (!loginRes.data.success || !loginRes.data.user) {
    throw new Error(`Login failed for existing user: ${JSON.stringify(loginRes.data)}`);
  }
  if (loginRes.data.user.schoolName !== 'Achimota School') {
    throw new Error(`School name was not retained on login! Got: ${loginRes.data.user.schoolName}`);
  }
  console.log(`✓ Existing user successfully logged in! Retained School: "${loginRes.data.user.schoolName}"`);

  // 5. Test recording quiz XP and checking School Challenge ranking
  console.log('\n>>> 5. Testing XP Earning and School Challenge Aggregation...');
  await post(
    '/api/quiz/record',
    {
      subject: 'Physics',
      difficulty: 'hard',
      correctAnswers: 5,
      totalQuestions: 5,
      fastAnswersCount: 3,
      mode: 'practice',
    },
    token1
  );

  // Register second student from same school to test school XP accumulation
  const testUser2 = {
    username: `Kofi${uid}`,
    email: `kofi${uid}@achimota.edu.gh`,
    password: 'Password123!',
    schoolName: 'Achimota School',
    shsLevel: 'SHS 2',
  };
  const reg2 = await post('/api/auth/register', testUser2);
  const token2 = reg2.data.token;

  await post(
    '/api/quiz/record',
    {
      subject: 'Chemistry',
      difficulty: 'medium',
      correctAnswers: 4,
      totalQuestions: 5,
      fastAnswersCount: 2,
      mode: 'practice',
    },
    token2
  );

  // Register third student from different school
  const testUser3 = {
    username: `Prempeh${uid}`,
    email: `ace${uid}@prempeh.edu.gh`,
    password: 'Password123!',
    schoolName: 'Prempeh College',
    shsLevel: 'SHS 3',
  };
  const reg3 = await post('/api/auth/register', testUser3);
  const token3 = reg3.data.token;

  await post(
    '/api/quiz/record',
    {
      subject: 'Core Mathematics',
      difficulty: 'easy',
      correctAnswers: 3,
      totalQuestions: 5,
      fastAnswersCount: 1,
      mode: 'practice',
    },
    token3
  );

  // Fetch leaderboards
  console.log('\n>>> 6. Testing Leaderboard and School Challenge endpoints...');
  const boardRes = await get('/api/leaderboards', token1);
  const { global, schools, userSchoolStats } = boardRes.data;

  console.log(`✓ Real students ranked on Global Leaderboard (${global.length}):`);
  global.forEach((s) => console.log(`   #${s.rank} ${s.username} (${s.schoolName}): ${s.xp} XP`));

  if (schools.length < 2) {
    throw new Error(`Expected at least 2 ranked schools, got ${schools.length}`);
  }

  console.log(`✓ Schools ranked on School Challenge Leaderboard (${schools.length}):`);
  schools.forEach((sc) => console.log(`   #${sc.rank} ${sc.schoolName}: ${sc.totalXp} XP (${sc.studentCount} students)`));

  // Verify Achimota School has at least 2 students
  const achimota = schools.find((s) => s.schoolName === 'Achimota School');
  if (!achimota || achimota.studentCount < 2) {
    throw new Error(`Expected Achimota School to have at least 2 students, got ${JSON.stringify(achimota)}`);
  }

  // Verify user's personal school stats
  if (!userSchoolStats || userSchoolStats.schoolName !== 'Achimota School') {
    throw new Error(`Invalid userSchoolStats: ${JSON.stringify(userSchoolStats)}`);
  }
  console.log(`✓ Student School Stats verified for ${testUser1.username}:`);
  console.log(`   School: "${userSchoolStats.schoolName}", National Rank: #${userSchoolStats.schoolRank}`);
  console.log(`   Personal Contribution: ${userSchoolStats.userContributionXp} XP (${userSchoolStats.contributionPercent}% of school total)`);

  // 7. Test Profile Update: changing school name does not duplicate or corrupt
  console.log('\n>>> 7. Testing Profile Update (School Name edit with validation)...');
  const updateRes = await put(
    '/api/user/profile',
    { schoolName: 'Achimota Secondary School' },
    token1
  );
  if (!updateRes.data.success || updateRes.data.user.schoolName !== 'Achimota Secondary School') {
    throw new Error(`Profile school update failed: ${JSON.stringify(updateRes.data)}`);
  }
  console.log(`✓ Profile school name updated successfully: "${updateRes.data.user.schoolName}"`);

  console.log('\n================================================================');
  console.log('🎉 ALL COMPULSORY AUTH, USERNAME DETECTION & SCHOOL CHALLENGE TESTS PASSED!');
  console.log('================================================================');
}

runAuthAndSchoolTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
