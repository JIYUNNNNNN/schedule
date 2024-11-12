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

// 내일 날짜 처리 함수
function parseTomorrowDateTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = tomorrow.getMonth() + 1;
  const day = tomorrow.getDate();
  return { month, day, hour: 0 }; // 기본 시간 00시로 설정
}

// 한국어 날짜와 시간을 처리하는 유틸리티 함수
function parseKoreanDateTime(dateString, timeString) {
  const datePattern = /(\d{1,2})월\s*(\d{1,2})일/; // "11월1일" 같은 형식도 인식하도록 공백을 선택적으로 처리
  const timePattern = /(오전|오후)?\s?(\d{1,2})시/; // "7시"도 인식 가능하도록 수정
  const isoDatePattern = /\d{4}-\d{2}-\d{2}/; // ISO 날짜 형식 정규식 (예: 2022-11-04)

  // '내일' 처리
  if (dateString.includes("내일")) {
    return parseTomorrowDateTime();
  }

  // ISO 날짜 형식 처리
  const isoDateMatch = dateString.match(isoDatePattern);
  if (isoDateMatch) {
    const [year, month, day] = isoDateMatch[0].split('-');
    return { month: parseInt(month, 10), day: parseInt(day, 10), hour: 0 };
  }

  // 날짜 패턴 매칭
  const dateMatch = dateString.match(datePattern);
  const timeMatch = timeString ? timeString.match(timePattern) : null;

  if (!dateMatch) {
    throw new Error('날짜 형식이 잘못되었습니다.');
  }

  let [, month, day] = dateMatch;
  month = parseInt(month, 10);
  day = parseInt(day, 10);

  let hour = 0; // 기본값을 0으로 설정
  if (timeMatch) {
    const [, period, timeHour] = timeMatch;
    hour = parseInt(timeHour, 10);

    if (period === '오후' && hour !== 12) {
      hour += 12; // 오후 시간을 12시간 더함
    } else if (period === '오전' && hour === 12) {
      hour = 0; // 오전 12시는 0시로 변환
    }
  }

  console.log(`Parsed Date: ${month}/${day}, Hour: ${hour}`); // 디버깅을 위한 로그
  return { month, day, hour };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { type, content } = req.body;

    if (type === 'delete') { // 삭제 처리
      // 사용자가 제공한 내용을 기반으로 제목과 날짜를 파싱합니다.
      const prompt = `
        Identify the event title and date to delete from the following message:
        Message: "${content}"
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
    
      const extractedData = gptResponse.data.choices[0].message.content.trim();
      console.log('Extracted data from GPT:', extractedData);
      
      // 예시: "내일 오전 10시에 회의 삭제" => { title: "회의", date: "내일", time: "오전 10시" }
      const { title, date, time } = JSON.parse(extractedData);
      
      // 날짜를 파싱합니다.
      const parsedDate = parseKoreanDateTime(date, time);
      
      // 날짜와 시간을 기반으로 이벤트를 검색합니다.
      const timeMin = new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day, parsedDate.hour).toISOString();
      const timeMax = new Date(parsedDate.year, parsedDate.month - 1, parsedDate.day, parsedDate.hour + 1).toISOString(); // 다음 시간까지 검색
    
      // 특정 날짜의 이벤트 가져오기
      const listResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });
    
      // 제목 비교 및 삭제
      const events = listResponse.data.items;
      let eventDeleted = false;
    
      for (const event of events) {
        // 제목이 일치하는 경우 삭제
        if (event.summary === title) {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: event.id, // 삭제할 이벤트 ID
          });
          eventDeleted = true;
          return res.json({ reply: `일정이 삭제되었습니다: ${event.summary}` });
        }
      }
    
      // 일치하는 일정이 없을 경우
      if (!eventDeleted) {
        res.status(404).json({ error: '삭제할 일정이 없습니다.' });
      }
      
    }else if (type === 'event') { // 일정 추가 처리
      // GPT 프롬프트 설정
      const prompt = `
        Extract event details from the following message. Ignore phrases like "넣어줘", "추가해줘" and return a clean event title.
        Return the event title, date (with start and end dates), and time (with start and end times) in a structured JSON format:
        {
          "eventTitle": "Event Title",
          "date": { "start": "Start Date", "end": "End Date" },
          "time": { "startTime": "Start Time", "endTime": "End Time" },
          "recurrence": "weekly/monthly/yearly"
        }
        Message: "${content}"
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
      console.log('Extracted data from GPT:', extractedData);

      const { eventTitle, date, time, recurrence } = JSON.parse(extractedData);

      // 필수 데이터 체크
      if (!date) {
        throw new Error('필수 일정 데이터가 누락되었습니다.');
      }

      const { start: startDate, end: endDate } = date;
      let startTime = time?.startTime || "00시";
      let endTime = time?.endTime || "23시59분";

      const startParsed = parseKoreanDateTime(startDate, startTime);
      const endParsed = parseKoreanDateTime(endDate || startDate, endTime);

      const currentYear = new Date().getFullYear();
      const startDateTime = new Date(currentYear, startParsed.month - 1, startParsed.day, startParsed.hour).toISOString();
      const endDateTime = new Date(currentYear, endParsed.month - 1, endParsed.day, endParsed.hour).toISOString();

      const event = {
        summary: eventTitle,
        start: { dateTime: startDateTime, timeZone: 'Asia/Seoul' },
        end: { dateTime: endDateTime, timeZone: 'Asia/Seoul' },
      };

      // 주기적 일정 추가
      if (recurrence) {
        if (recurrence === 'weekly') {
          event.recurrence = ['RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=104'];
        } else if (recurrence === 'monthly') {
          event.recurrence = ['RRULE:FREQ=MONTHLY;INTERVAL=1;COUNT=24'];
        } else if (recurrence === 'yearly') {
          event.recurrence = ['RRULE:FREQ=YEARLY;INTERVAL=1;COUNT=10'];
        }
      }

      const calendarResponse = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      res.json({ reply: `일정이 추가되었습니다: ${eventTitle}`, event: calendarResponse.data });
    } else {
      // 기타 요청 처리
      const prompt = `"${content}"`;
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
    const currentDate = new Date();
    const fiveMonthsLater = new Date();
    fiveMonthsLater.setMonth(currentDate.getMonth() + 20); // 현재 날짜에서 5개월 후
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMax: fiveMonthsLater.toISOString(), // 5개월 후까지
      maxResults: 100,
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
// 구글 캘린더 이벤트 제목으로 검색 후 삭제하기
app.delete('/api/delete-event-by-title', async (req, res) => {
  try {
    const { title, startDate, endDate } = req.body;
    
    // 이벤트 목록 가져오기
    const events = await calendar.events.list({
      calendarId: 'primary',
      q: title,
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
    });
    
    // 제목에 맞는 이벤트가 있는지 확인
    if (events.data.items.length === 0) {
      return res.status(404).json({ message: '해당 제목의 이벤트를 찾을 수 없습니다.' });
    }
    
    // 첫 번째 검색 결과 이벤트 삭제
    const eventId = events.data.items[0].id;
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    res.json({ message: '이벤트가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '이벤트 삭제 중 오류가 발생했습니다.' });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT || 3001}`);
});
