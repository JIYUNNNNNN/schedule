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

// 주기적인 일정 인식 및 RRULE 생성
function parseRecurrence(content) {
  const recurrencePattern = /매(주|달|년)\s+(일요일|월요일|화요일|수요일|목요일|금요일|토요일|\d{1,2})\s*(오전|오후)?\s*(\d{1,2})시/;
  const match = content.match(recurrencePattern);

  if (match) {
    const frequency = match[1]; // 주기 (주, 달, 년)
    const dayOrDate = match[2]; // 요일 혹은 날짜
    const period = match[3]; // 오전/오후
    let hour = parseInt(match[4], 10); // 시간

    // 오전/오후 시간 변환
    if (period === '오후' && hour < 12) hour += 12;
    if (period === '오전' && hour === 12) hour = 0;

    // 요일을 숫자로 변환
    const dayOfWeekMap = {
      '일요일': 'SU',
      '월요일': 'MO',
      '화요일': 'TU',
      '수요일': 'WE',
      '목요일': 'TH',
      '금요일': 'FR',
      '토요일': 'SA',
    };

    // 반복 규칙 (RRULE) 생성
    let rrule = '';
    if (frequency === '주') {
      rrule = `RRULE:FREQ=WEEKLY;BYDAY=${dayOfWeekMap[dayOrDate]};INTERVAL=1;COUNT=104`; // 2년 동안 반복
    } else if (frequency === '달') {
      const day = parseInt(dayOrDate, 10);
      rrule = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day};INTERVAL=1;COUNT=24`; // 2년 동안 반복
    } else if (frequency === '년') {
      const month = parseInt(dayOrDate, 10);
      rrule = `RRULE:FREQ=YEARLY;BYMONTH=${month};INTERVAL=1;COUNT=10`; // 10년 동안 반복
    }

    return { rrule, hour }; // 주기적 일정 데이터 반환
  }

  return null; // 주기적 일정이 없을 경우 null 반환
}
 
// 지정된 일수 후의 날짜와 시간 처리 함수
function parseFutureDateTime(daysAfter, timeString) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAfter);

  const timePattern = /(오전|오후)?\s?(\d{1,2})시/;
  const timeMatch = timeString ? timeString.match(timePattern) : null;
  
  let hour = 0; // 기본값을 0시로 설정
  
  if (timeMatch) {
    const [, period, timeHour] = timeMatch;
    hour = parseInt(timeHour, 10);

    if (period === '오후' && hour !== 12) {
      hour += 12; // 오후 시간을 12시간 더함
    } else if (period === '오전' && hour === 12) {
      hour = 0; // 오전 12시는 0시로 변환
    }
  }

  const month = futureDate.getMonth() + 1;
  const day = futureDate.getDate();
  return { month, day, hour };
}

// 날짜와 시간을 한국어 표현으로 파싱하는 함수
function parseKoreanDateTime(dateString, timeString) {
  const datePattern = /(\d{1,2})월\s*(\d{1,2})일/; // "11월 1일" 형식
  const timePattern = /(오전|오후|아침|낮|저녁|밤|새벽)?\s?(\d{1,2})시/; // "저녁 7시" 등의 형식
  const isoDatePattern = /\d{4}-\d{2}-\d{2}/; // ISO 날짜 형식 (예: 2022-11-04)

  const now = new Date();

  // 특정 한국어 날짜 표현 처리
  if (dateString.includes("내일")) {
    return parseFutureDateTime(1, timeString);
  }
  if (dateString.includes("모레")) {
    return parseFutureDateTime(2, timeString);
  }
  if (dateString.includes("글피")) {
    return parseFutureDateTime(3, timeString);
  }
  if (dateString.includes("그글피")) {
    return parseFutureDateTime(4, timeString);
  }

  // '오늘'에 대한 처리
  if (dateString.includes("오늘")) {
    let hour = 0; // 기본값을 0시로 설정
    let minute = 0; // 기본값을 0분으로 설정

    const timeMatch = timeString ? timeString.match(timePattern) : null;

    if (timeMatch) {
      const [, period, timeHour] = timeMatch;
      hour = parseInt(timeHour, 10);

      // 오전/오후 또는 시간대에 따라 24시간 형식으로 변환
      if (period === '오후' && hour !== 12) {
        hour += 12;
      } else if (period === '오전' && hour === 12) {
        hour = 0;
      }
      // 시간대별 처리 (새벽, 아침, 낮, 저녁, 밤)
      else if (['저녁', '밤'].includes(period) && hour < 12) {
        hour += 12;
      } else if (period === '새벽' && hour === 12) {
        hour = 0;
      }
    }

    return {
      month: now.getMonth() + 1, // 월은 0부터 시작하므로 +1
      day: now.getDate(),         // 오늘의 일(day)
      hour,                       // 시간 (24시간 형식)
      minute                      // 기본적으로 0분 설정
    };
  }

  // ISO 날짜 형식 처리
  const isoDateMatch = dateString.match(isoDatePattern);
  if (isoDateMatch) {
    const [year, month, day] = isoDateMatch[0].split('-');
    return { month: parseInt(month, 10), day: parseInt(day, 10), hour: 0 };
  }

  // "11월 1일" 형식의 날짜 패턴 처리
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

    if (period) {
      switch (period) {
        case '오후':
        case '저녁':
        case '밤':
          if (hour < 12) hour += 12;
          break;
        case '오전':
        case '아침':
        case '새벽':
          if (hour === 12) hour = 0;
          break;
        case '낮':
          if (hour < 6) hour += 12; // 낮은 일반적으로 12시부터 오후 6시까지로 가정
          break;
      }
    }
  }
  console.log(`Parsed Date: ${month}/${day}, Hour: ${hour}`); // 디버깅을 위한 로그
  return { month, day, hour };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { type, content } = req.body;

    if (type === 'delete') {
        // GPT 프롬프트 설정 (더 구체적)
        const prompt = `
            Identify only the event title in the message below. Ignore words like "delete" or "remove". 
            Only return the event title exactly as it appears.
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

        // GPT 응답에서 제목과 날짜 추출
        let extractedTitle = gptResponse.data.choices[0].message.content.trim();
        
        // 불필요한 단어가 포함되어 있는지 확인하고 정리 (예: "삭제", "해줘")
        extractedTitle = extractedTitle.replace(/(삭제|해줘|제거)/g, '').trim();

        console.log('Extracted event title to delete:', extractedTitle);

        // 날짜가 없을 경우 오류 반환
        const dateMatch = content.match(/\d+월 \d+일/);
        const extractedDate = dateMatch ? dateMatch[0] : null;

        console.log('Extracted event date:', extractedDate);

        if (!extractedDate) {
            return res.status(400).json({ error: '삭제할 날짜를 찾을 수 없습니다.' });
        }

        // 날짜 파싱
        const eventDate = new Date(`${new Date().getFullYear()}-${extractedDate.replace('월 ', '-').replace('일', '')}`);
        if (isNaN(eventDate)) {
            return res.status(400).json({ error: '날짜 형식이 잘못되었습니다.' });
        }

        const timeMin = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).toISOString();
        const timeMax = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1).toISOString();

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
            if (event.summary === extractedTitle) {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: event.id,
                });
                eventDeleted = true;
                return res.json({ reply: `일정이 삭제되었습니다: ${event.summary}` });
            }
        }

        // 일치하는 일정이 없을 경우
        if (!eventDeleted) {
            res.status(404).json({ error: '삭제할 일정이 없습니다.' });
        }
    }
else if (type === 'event') { // 일정 추가 처리
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
      let endTime = time?.endTime || startTime; // 종료 시간이 없으면 시작 시간과 동일하게 설정
    
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

//업데이트
app.put('/api/update-event/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const {summary, start, end } = req.body;

    if (!summary) {
      console.error('Error: summary is missing');
      return res.status(400).json({ error: 'summary is required' });
    }
    const updatedEvent = {
      summary, 
      start: { dateTime: start },
      end: { dateTime: end },
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updatedEvent,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error updating event in Google Calendar:', error);
    res.status(500).json({ error: 'Failed to update event in Google Calendar' });
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
