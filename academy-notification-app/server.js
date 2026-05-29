const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock student database
let students = [
  { id: 1, name: '김예준', school: '연주중', grade: '2학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: true },
  { id: 2, name: '김우진A', school: '연주중', grade: '2학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 3, name: '김건아', school: '대명중', grade: '3학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: true },
  { id: 4, name: '김예나', school: '대원중', grade: '3학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 5, name: '김우현', school: '가원중', grade: '2학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 6, name: '김율리', school: '서초중', grade: '2학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 7, name: '김용현', school: '서초중', grade: '1학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 8, name: '김효린', school: '언북중', grade: '2학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 9, name: '김지우', school: '중동중', grade: '2학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 10, name: '김지안', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 11, name: '김한준', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 12, name: '김도윤', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 13, name: '김빈', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 14, name: '김예호', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: true },
  { id: 15, name: '김주한', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 16, name: '김하율', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 17, name: '김세인', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 18, name: '김다다A', school: '한성과고', grade: '1학년', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: false },
  { id: 19, name: '김재준', school: '-', grade: '-', class: '-', division: '-', phoneCount: 1, hadaInfo: '-', checked: true }
];

// Mock templates
const templates = [
  { id: 1, title: '[안내] 수업 일정 및 과제 안내', content: '[보충수업 안내]\n안녕하세요, %% 학생 보호자님.\n금주 진행되는 보충수업 일정을 안내해 드립니다.\n\n- 일시: 토요일 오전 10:00\n- 준비물: 교재 및 필기구\n- 과제: 워크북 4단원 풀이\n\n학생들이 수업에 늦지 않도록 확인 부탁드립니다.' },
  { id: 2, title: '[공지] 학원 정기 휴무 및 보강 안내', content: '[학원 공지]\n안녕하세요, %% 학생 보호자님.\n학원 정기 휴무일(6월 5일) 및 보강 일정을 안내드립니다.\n\n- 휴무일: 6/5(화) 전관 휴무\n- 보강일: 6/8(금) 동일 시간대 수업\n\n이용에 불편 없으시길 바랍니다. 감사합니다.' },
  { id: 3, title: '[알림] 수강료 납부 안내', content: '[수강료 안내]\n안녕하세요, %% 학생 보호자님.\n이번 달 수강료 납부 기간 및 계좌 정보를 안내해 드립니다.\n\n- 납부 기간: 매월 1일 ~ 5일\n- 계좌: 신한은행 110-123-456789 (예금주: 보충수업학원)\n\n기한 내에 납부 완료 부탁드립니다.' },
  { id: 4, title: '[출결] 미등원 안내', content: '[출결 안내]\n안녕하세요, %% 학생 보호자님.\n금일 %% 학생이 수업 시작 시간(15:00)까지 등원하지 않아 안내 연락 드립니다.\n\n사유가 있으시거나 지각 예정인 경우 학원으로 연락 부탁드립니다.' }
];

// Mock database for message logs
let sendLogs = [];

// API endpoints
app.get('/api/students', (req, res) => {
  res.json(students);
});

app.get('/api/templates', (req, res) => {
  res.json(templates);
});

app.post('/api/send-message', (req, res) => {
  const { title, content, type, recipients, hadaEnabled, smsEnabled, reserveEnabled, reserveTime } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: '알림명과 알림내용은 필수 입력 항목입니다.' });
  }

  if (!recipients || recipients.length === 0) {
    return res.status(400).json({ error: '수신 대상을 1명 이상 선택해 주세요.' });
  }

  const logEntry = {
    id: Date.now(),
    title,
    content,
    type,
    recipientsCount: recipients.length,
    recipientsNames: recipients.map(r => r.name).join(', '),
    channels: { hada: hadaEnabled, sms: smsEnabled },
    isReserved: reserveEnabled,
    scheduledAt: reserveEnabled ? reserveTime : '즉시 발송',
    timestamp: new Date().toISOString()
  };

  sendLogs.unshift(logEntry); // Add to the top of logs

  // Simulate server sending latency
  setTimeout(() => {
    res.json({ success: true, message: '알림 발송이 완료되었습니다.', log: logEntry });
  }, 1500);
});

app.get('/api/logs', (req, res) => {
  res.json(sendLogs);
});

// Fallback to SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
