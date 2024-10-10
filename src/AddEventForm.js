import React, { useState } from 'react';

function AddEventForm({ selectedEvent, calendar }) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(selectedEvent ? selectedEvent.start : '');
  const [endDate, setEndDate] = useState(selectedEvent ? selectedEvent.end : '');

  const handleSubmit = (e) => {
    e.preventDefault();

    const event = {
      summary,
      description,
      start: {
        dateTime: new Date(startDate).toISOString(),
        timeZone: 'Asia/Seoul', // 서울 시간대 설정
      },
      end: {
        dateTime: new Date(endDate).toISOString(),
        timeZone: 'Asia/Seoul', // 서울 시간대 설정
      },
    };

    fetch('http://localhost:3001/api/add-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Event added:', data);
        alert('일정추가 완료하였습니다.');
        if (calendar) {
          calendar.refetchEvents(); // 캘린더 새로고침
        }
      })
      .catch(err => {
        console.error('Failed to add event:', err);
        alert('Error adding event');
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        제목:
        <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </label>
      <label>
        내용:
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        시작일:
        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>
      <label>
        종료일:
        <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>
      <button type="submit">일정 추가</button>
    </form>
  );
}

export default AddEventForm;
