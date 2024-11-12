import React, { useEffect, useState } from 'react';
import AddEventForm from './AddEventForm';
import Chatbot from './chatbot'; // 챗봇 컴포넌트 추가
import FullCalendar from '@fullcalendar/react'; // FullCalendar 컴포넌트 가져오기
import dayGridPlugin from '@fullcalendar/daygrid'; // dayGridPlugin 가져오기
import timeGridPlugin from '@fullcalendar/timegrid'; // timeGridPlugin 가져오기
import listPlugin from '@fullcalendar/list'; // listPlugin 가져오기
import { format } from 'date-fns'; // date-fns 라이브러리에서 format 가져오기
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import './App.css'; // 스타일 임포트

const API_KEY = '5020074f27033cc755f8d46cb70473ec'; // API 키 정의

function App() {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ content_title: '', description: '', location: '', start: '', end: '' });
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mouseX, setMouseX] = useState(undefined);
  const [mouseY, setMouseY] = useState(undefined);
  const [weather, setWeather] = useState(null); // 날씨 정보 상태 추가

  // 방위각을 문자열로 변환하는 함수
  const degToCompass = (deg) => {
    const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서', '북'];
    return directions[Math.round(deg / 45) % 8];
  };

  // 팝업 폼 표시 위치를 조정하는 메서드
  const handleShowForm = () => {
    setShowAddEventForm(!showAddEventForm);
  };
  

  // 일정 추가 핸들러
  const handleAddEvent = (dateStr) => {
    setNewEvent({ ...newEvent, start: dateStr, end: dateStr });
    setShowAddEventForm(true);
  };

  // 일정 삭제 핸들러
  const handleDelete = () => {
    if (selectedEvent) {
      const confirmed = window.confirm("정말로 이 이벤트를 삭제하시겠습니까?");
      if (confirmed) {
        handleConfirmDelete(selectedEvent.id); // 이벤트 삭제 로직 호출
      }
    }
  };

  // 일정 삭제 확정
  const handleConfirmDelete = (eventId) => {
    if (eventId) {
      fetch(`http://localhost:3001/api/delete-event/${eventId}`, {
        method: 'DELETE',
      })
        .then((response) => {
          if (response.ok) {
            setEvents((prevEvents) => prevEvents.filter(event => event.id !== eventId));
            setSelectedEvent(null);
          } else {
            console.error('구글 캘린더 이벤트 삭제 실패');
          }
        })
        .catch((error) => {
          console.error('이벤트 삭제 중 오류 발생:', error);
        });
    }
  };

  // 이벤트 가져오기
  const fetchEvents = () => {
    fetch('http://localhost:3001/api/events')
      .then((response) => response.json())
      .then((data) => {
        const calendarEvents = data.map((event) => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          location: event.location || '',
          description: event.description || '',
        }));
        setEvents(calendarEvents);
      })
      .catch((error) => console.error('이벤트 가져오기 중 오류 발생:', error));
  };

  // 새 이벤트 저장 핸들러
  const handleSave = () => {
    const event = {
      title: `${newEvent.content_title} - ${newEvent.description}`,
      start: newEvent.start,
      end: newEvent.end,
      location: newEvent.location,
    };

    setEvents((prevEvents) => [...prevEvents, event]);
    setNewEvent({ content_title: '', description: '', location: '', start: '', end: '' });
    setShowAddEventForm(false);
  };

  // 이벤트 클릭 핸들러
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const { clientX: mouseX, clientY: mouseY } = clickInfo.jsEvent;
    setSelectedEvent(event);
    setMouseX(mouseX);
    setMouseY(mouseY - 90); // 90px 위로 이동
  };

  // 이벤트 세부 정보 표시
  const showEventDetails = () => {
    if (selectedEvent && mouseX !== undefined && mouseY !== undefined) {
      const startDate = selectedEvent.start && format(selectedEvent.start, 'HH:mm', { timeZone: 'Asia/Seoul' });
      const endDate = selectedEvent.end && format(selectedEvent.end, 'HH:mm', { timeZone: 'Asia/Seoul' });
      
      return (
        <div className="event-details" style={{ position: 'absolute', left: mouseX, top: mouseY }}>
          <h2>{selectedEvent.title}</h2>
          <p>메모 : {selectedEvent.extendedProps.description}</p>
          <div className='time_place'>
            <p>시간 : {startDate} ~ {endDate}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
          <button onClick={() => setSelectedEvent(null)}>닫기</button>
          <button onClick={handleDelete}>삭제</button>
          </div>
        </div>
      );
    }
    return null;
  };

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
  }, []); // API_KEY는 useEffect 안에서 사용하지 않음

  return (
    <div className="app-container">
      <div className="calendar-container">
        <div>
          <button onClick={handleShowForm} className="add-event-button">
            <FontAwesomeIcon icon={faPlus} size="2x" />
          </button>

          {/* 팝업 폼 */}
          {showAddEventForm && (
            <div className="popup-form" style={{ position: 'absolute', top: '50px', left: '70px', zIndex: 1000 }}>
              <AddEventForm
                newEvent={newEvent}
                setNewEvent={setNewEvent}
                onSave={handleSave}
                onClose={handleShowForm}
              />
            </div>
          )}

<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
  initialView="dayGridMonth"
  events={events}
  dateClick={(info) => handleAddEvent(info.dateStr)}
  eventClick={handleEventClick}
  locale="ko"
  headerToolbar={{
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
  }}
  buttonText={{
    prev: '<',
    next: '>',
    today: 'Today',
    dayGridMonth: 'Month',
    timeGridWeek: 'Week',
    timeGridDay: 'Day',
    listMonth: 'list',
  }}
  titleFormat={{
    year: 'numeric',
    month: 'long', // 년도와 월만 표시
  }}
  views={{
    dayGrid: {
      fixedWeekCount: false,
      dayMaxEvents: 5,
    }
  }}
/>

          {showEventDetails()}

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
      </div>

      <div className="chatbot-container">
        <Chatbot />
      </div>
    </div>
  );
}

export default App;
