import express from 'express';
import { google } from 'googleapis';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // CORS 설정 추가

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // 환경 변수로 API 키 설정

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// 한국어 날짜와 시간을 처리하는 유틸리티 함수
function parseKoreanDateTime(dateString, timeString) {
  const datePattern = /(\d{1,2})월 (\d{1,2})일/;
  const timePattern = /([오전|오후]) (\d{1,2})시/;

  const dateMatch = dateString.match(datePattern);
  const timeMatch = timeString.match(timePattern);

  if (!dateMatch || !timeMatch) {
    throw new Error('날짜 또는 시간 형식이 잘못되었습니다.');
  }

  let [_, month, day] = dateMatch;
  month = parseInt(month, 10);
  day = parseInt(day, 10);

  let [__, period, hour] = timeMatch;
  hour = parseInt(hour, 10);

  if (period === '오후' && hour !== 12) {
    hour += 12;
  } else if (period === '오전' && hour === 12) {
    hour = 0; // 오전 12시는 0시로 변환
  }

  return { month, day, hour };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { type, content } = req.body; // type과 content를 분리합니다.

    if (type === 'event') {
      const prompt = `
        Extract event details from the following message. 
        Return the event title, date (with start and end dates), 
        and time (with start and end times) in a structured JSON format like this:
        {
          "eventTitle": "Your Event Title",
          "date": {
            "start": "Start Date",
            "end": "End Date"
          },
          "time": {
            "startTime": "Start Time",
            "endTime": "End Time"
          }
        }
        The message is: "${content}"
      `;

      const gptResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const extractedData = gptResponse.data.choices[0].message.content;
      console.log('Extracted data from GPT:', extractedData); // 여기에 로그 추가

      // JSON 파싱
      const { eventTitle, date, time } = JSON.parse(extractedData);

      // 필수 데이터 체크
      if (!date || !time) {
        throw new Error('필수 일정 데이터가 누락되었습니다.');
      }

      const { start: startDate, end: endDate } = date;
      const { startTime, endTime } = time;

      // 시작 날짜와 시간 파싱
      const { month: startMonth, day: startDay, hour: startHour } = parseKoreanDateTime(startDate, startTime);

      // 종료 날짜와 시간 파싱
      const { month: endMonth, day: endDay, hour: endHour } = parseKoreanDateTime(endDate, endTime);

      const currentYear = new Date().getFullYear();
      const startDateTime = new Date(currentYear, startMonth - 1, startDay, startHour).toISOString();
      const endDateTime = new Date(currentYear, endMonth - 1, endDay, endHour).toISOString();

      // Google Calendar 이벤트 생성
      const event = {
        summary: eventTitle,
        start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
        end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
      };

      const calendarResponse = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      res.json({ reply: `일정이 추가되었습니다: ${eventTitle}`, event: calendarResponse.data });

    } else {
      // 일반 GPT 챗 메시지 처리
      const prompt = `
        "${content}"
      `;
      const gptResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const botReply = gptResponse.data.choices[0].message.content;
      res.json({ reply: botReply });
    }

  } catch (error) {
    console.error('Error processing chat or adding event:', error);
    res.status(500).json({ error: '처리 중 오류 발생', details: error.message });
  }
});

// 구글 캘린더 이벤트 가져오기
app.get('/api/events', async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.json(response.data.items);
  } catch (error) {
    console.error('Error fetching events:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching events', details: error.message });
  }
});

// 일정 추가 API
app.post('/api/add-event', async (req, res) => {
  try {
    const event = req.body;
    console.log('Received event:', event); // 요청 데이터 로그 출력
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error adding event:', error); // 오류 메시지 로그 출력
    res.status(500).json({ error: 'Error adding event' });
  }
});

// 일정 삭제 API
app.delete('/api/delete-event/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    res.json({ message: '이벤트 삭제됨' });
  } catch (error) {
    console.error('Error deleting event:', error); // 오류 메시지 로그 출력
    res.status(500).json({ error: 'Error deleting event' });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT || 3001}`);
});
