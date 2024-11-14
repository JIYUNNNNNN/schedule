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
import interactionPlugin from '@fullcalendar/interaction'; // 드래그앤 드롭 기능 추가

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
const handleAddEvent = (dateStr, jsEvent) => {
  // 클릭한 날짜를 기준으로 00:00으로 시작 시간을 설정
  const startDate = new Date(dateStr);
  //startDate.setHours(0, 0, 0, 0); // 시간을 00:00으로 설정
  const endDate = new Date(startDate);
  //endDate.setHours(1, 0, 0, 0); // 종료 시간을 1시간 뒤로 설정

  const start = startDate.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:mm'
  const end = endDate.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:mm'

  const { adjustedX, adjustedY } = adjustPopupPosition(jsEvent.clientX, jsEvent.clientY);
  
  setNewEvent({ ...newEvent, start, end });
  setMouseX(jsEvent.clientX); // 클릭한 위치의 X 좌표 저장
  setMouseY(jsEvent.clientY); // 클릭한 위치의 Y 좌표 저장
  setShowAddEventForm(true);
};

const adjustPopupPosition = (x, y) => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 화면 밖으로 나가지 않도록 위치 조정
  const adjustedX = Math.min(x, windowWidth - 300); // 300px은 팝업 너비
  const adjustedY = Math.min(y, windowHeight - 200); // 200px은 팝업 높이
  return { adjustedX, adjustedY };
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
        const calendarEvents = data.map((event) => {
          let startTime = event.start.dateTime || event.start.date;
          let endTime = event.end.dateTime || event.end.date;
  
          // 시작 시간과 끝 시간이 같으면 종료 시간을 1시간 뒤로 설정
          if (startTime === endTime) {
            const adjustedEndTime = new Date(startTime);
            adjustedEndTime.setHours(adjustedEndTime.getHours() + 1);
            endTime = adjustedEndTime.toISOString();
          }
  
          return {
            id: event.id,
            title: event.summary,
            start: startTime,
            end: endTime,
            location: event.location || '',
            description: event.description || '',
          };
        });
        setEvents(calendarEvents);
      })
      .catch((error) => console.error('이벤트 가져오기 중 오류 발생:', error));
  };

  // 새 이벤트 저장 핸들러
  const handleSave = (event) => {
    // const event = {
    //   title: `${newEvent.content_title} - ${newEvent.description}`,
    //   start: newEvent.start,
    //   end: newEvent.end,
    //   location: newEvent.location,
    // };

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
  const handleEventDrop = (info) => {
    const updatedEvent = {
      id: info.event.id,
      summary: info.event.title,  // 제목 정보 추가
      start: info.event.startStr,
      end: info.event.endStr,
    };

    fetch(`http://localhost:3001/api/update-event/${info.event.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedEvent),
    })
      .then((response) => {
        if (response.ok) {
          setEvents((prevEvents) =>
            prevEvents.map((event) =>
              event.id === updatedEvent.id
                ? { ...event, start: updatedEvent.start, end: updatedEvent.end }
                : event
            )
          );
        } else {
          console.error('이벤트 업데이트 실패');
        }
      })
      .catch((error) => {
        console.error('이벤트 업데이트 중 오류 발생:', error);
      });
  };

  const handleEventResize = (info) => {
    const updatedEvent = {
      id: info.event.id,
      summary: info.event.title,
      start: info.event.startStr,
      end: info.event.end ? info.event.end.toISOString() : info.event.start.toISOString(),  // 하루 일정 처리
    };

    fetch(`http://localhost:3001/api/update-event/${info.event.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        body: JSON.stringify(updatedEvent),
      },
      body: JSON.stringify(updatedEvent),
    })
      .then((response) => {
        if (response.ok) {
          setEvents((prevEvents) =>
            prevEvents.map((event) =>
              event.id === updatedEvent.id
                ? { ...event, start: updatedEvent.start, end: updatedEvent.end }
                : event
            )
          );
        } else {
          console.error('이벤트 업데이트 실패');
        }
      })
      .catch((error) => {
        console.error('이벤트 업데이트 중 오류 발생:', error);
      });
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
          {/* <button onClick={handleShowForm} className="add-event-button">
            <FontAwesomeIcon icon={faPlus} size="2x" />
          </button> */}

          {/* 팝업 폼 */}
          {showAddEventForm && (
            <div className="popup-form" style={{ position: 'absolute', top: mouseY, left: mouseX, zIndex: 1000 }}>
              <AddEventForm
                newEvent={newEvent}
                setNewEvent={setNewEvent}
                onSave={handleSave}
                onClose={handleShowForm}
              />
            </div>
          )}

<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} // interactionPlugin 추가
  initialView="dayGridMonth"
  events={events}
  dateClick={(info) => handleAddEvent(info.dateStr, info.jsEvent)}
  eventClick={handleEventClick}
  eventDrop={handleEventDrop} // 이벤트 드래그앤 드롭 핸들러 추가
  eventResize={handleEventResize} // 이벤트 리사이즈 핸들러 추가
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
  editable={true} // 드래그앤 드롭을 활성화
  droppable={true} // 외부 드래그 지원 활성화
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
                {/* <tr>
                  <th>지역</th>
                  <th>날씨</th>
                  <th>온도</th>
                  <th>풍향/풍속</th>
                </tr> */}
              </thead>
              <tbody>
                <tr>
                  <td>{weather.city}</td>
                  <td>{weather.description}</td>
                  <td>{weather.temperature}°C</td>
                  {/* <td>{weather.wind}</td> */}
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
