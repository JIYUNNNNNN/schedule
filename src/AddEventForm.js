import React, { useState } from 'react';

function AddEventForm({ selectedEvent, calendar, onClose }) {
  const todayDateTime = new Date().toISOString().slice(0, 16);

  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(selectedEvent ? selectedEvent.start.slice(0, 16) : todayDateTime);
  const [endDate, setEndDate] = useState(selectedEvent ? selectedEvent.end.slice(0, 16) : todayDateTime);

  const handleSubmit = (e) => {
    e.preventDefault();

    const event = {
      summary,
      description,
      start: {
        dateTime: new Date(startDate).toISOString(),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: new Date(endDate).toISOString(),
        timeZone: 'Asia/Seoul',
      },
    };

    fetch('http://localhost:3001/api/add-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Event added:', data);
        alert('일정이 추가되었습니다.');
        if (calendar) {
          calendar.refetchEvents();
        }
        onClose();
      })
      .catch((err) => {
        console.error('Failed to add event:', err);
        alert('일정 추가 중 오류가 발생했습니다.');
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <input
          placeholder="제목을 입력해주세요"
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
        />
      </label>
      <label>
        <textarea
          placeholder="내용을 입력해주세요"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>
      <label>
        시작일:
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </label>
      <label>
        종료일:
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </label>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
        <button type="submit">일정 추가</button>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    </form>
  );
}

export default AddEventForm;
