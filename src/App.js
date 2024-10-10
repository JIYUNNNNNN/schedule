import React, { useEffect, useState } from 'react';
import AddEventForm from './AddEventForm';
import DeleteEventForm from './DeleteEventForm';
import Chatbot from './chatbot'; // 챗봇 컴포넌트 추가
import './App.css'; // 스타일 임포트

function App() {
  const [events, setEvents] = useState([]);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [showDeleteEventForm, setShowDeleteEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [weather, setWeather] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const API_KEY = '5020074f27033cc755f8d46cb70473ec'; // OpenWeatherMap API 키를 여기에 입력하세요

  const handleAddEvent = (dateStr) => {
    setSelectedEvent({ start: dateStr, end: dateStr });
    setShowAddEventForm(true);
  };

  const handleDeleteEvent = (eventId) => {
    setSelectedEvent({ id: eventId });
    setShowDeleteEventForm(true);
  };

  const fetchEvents = () => {
    fetch('http://localhost:3001/api/events')
      .then((response) => response.json())
      .then((data) => {
        const calendarEvents = data.map((event) => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          description: event.description || '',
        }));
        setEvents(calendarEvents);
      })
      .catch((error) => console.error('이벤트 가져오기 중 오류 발생:', error));
  };

  const degToCompass = (num) => {
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ['북', '북북동', '동북동', '동동북', '동', '동동남', '남동', '남남동', '남', '남남서', '서남서', '서서남', '서', '서북서', '북서', '북북서'];
    return arr[(val % 16)];
  };

  // 캘린더 인스턴스는 한 번만 생성
  useEffect(() => {
    const calendarEl = document.getElementById('calendar');
    const calendarInstance = new window.FullCalendar.Calendar(calendarEl, {
      locale: 'ko',
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
      },
      eventClick: function (info) {
        const start_year = info.event.start.getUTCFullYear();
        const start_month = info.event.start.getMonth() + 1;
        const start_date = info.event.start.getUTCDate();
        const start_hour = info.event.start.getHours();
        const end_hour = info.event.end ? info.event.end.getHours() : '';

        const start = `${start_year}-${start_month}-${start_date} ${start_hour}시 ~ ${end_hour}시`;

        const attends = info.event.extendedProps.attachments
          ? info.event.extendedProps.attachments.map(item => `<div><a href='${item.fileUrl}' target='_blank'>[첨부파일]</a></div>`).join('')
          : '';

        const description = info.event.extendedProps.description || '';

        const contents = `
          <div style='font-weight:bold; font-size:20px; margin-bottom:30px; text-align:center'>
            ${start}
          </div>
          <div style='font-size:18px; margin-bottom:20px'>
            제목: ${info.event.title}
          </div>
          <div style='width:500px'>
            ${description}
            ${attends}
          </div>
          <div style='margin-top: 20px; text-align: center;'>
            <button id="add-event-button" data-event-id="${info.event.id}">일정 추가</button>
            <button id="delete-event-button" data-event-id="${info.event.id}">일정 삭제</button>
          </div>
        `;

        window.$('#popup').html(contents);
        window.$('#popup').bPopup({
          speed: 650,
          transition: 'slideIn',
          transitionClose: 'slideBack',
          position: [(document.documentElement.clientWidth - 500) / 2, 30], // x, y
        });

        document.getElementById('add-event-button').onclick = () => handleAddEvent(info.event.id);
        document.getElementById('delete-event-button').onclick = () => handleDeleteEvent(info.event.id);

        info.jsEvent.stopPropagation();
        info.jsEvent.preventDefault();
      },
      dateClick: function(info) {
        handleAddEvent(info.dateStr);
      }
    });

    setCalendar(calendarInstance);
    calendarInstance.render();
  }, []);

  // events가 변경될 때마다 이벤트 소스만 업데이트
  useEffect(() => {
    if (calendar) {
      calendar.removeAllEvents();
      calendar.addEventSource(events);
    }
  }, [events, calendar]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`
      )
        .then(response => response.json())
        .then(data => {
          setWeather({
            city: data.name,
            description: data.weather[0].description,
            temperature: Math.round(data.main.temp),
            wind: `${degToCompass(data.wind.deg)} ${data.wind.speed}m/s`
          });
        })
        .catch(err => console.error('날씨 데이터 가져오기 실패:', err));
    });
    fetchEvents();
  }, [API_KEY]);

  return (
    <div className="app-container">
      <div className="calendar-container">
        <div>
          <button onClick={() => setShowAddEventForm(!showAddEventForm)}>
            {showAddEventForm ? '일정 추가 폼 닫기' : '일정 추가'}
          </button>
          {showAddEventForm && <AddEventForm selectedEvent={selectedEvent} calendar={calendar} />}
          {showDeleteEventForm && <DeleteEventForm selectedEvent={selectedEvent} onDelete={fetchEvents} />}
          <div id="calendar"></div>
          {weather && (
            <table className="weather" style={{ borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr>
                  <th>지역</th>
                  <th>날씨</th>
                  <th>온도</th>
                  <th>풍향/풍속</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{weather.city}</td>
                  <td>{weather.description}</td>
                  <td>{weather.temperature}°C</td>
                  <td>{weather.wind}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div
          id="popup"
          style={{
            width: '500px',
            height: '600px',
            display: 'none',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '14px',
            border: '2px solid #eeeeee',
          }}
        ></div>
      </div>
      <div className="chatbot-container">
        <Chatbot /> {/* 챗봇 컴포넌트 */}
      </div>
    </div>
  );
}

export default App;
