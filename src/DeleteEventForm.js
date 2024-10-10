import React, { useState } from 'react';

function DeleteEventForm({ selectedEvent, onDelete }) {
  const [eventId, setEventId] = useState(selectedEvent ? selectedEvent.id : '');

  const handleDelete = (e) => {
    e.preventDefault();

    fetch(`http://localhost:3001/api/delete-event/${eventId}`, {
      method: 'DELETE',
    })
      .then(response => response.json())
      .then(() => {
        console.log('Event deleted');
        alert('Event deleted successfully!');
        if (onDelete) {
          onDelete(); // 부모 컴포넌트에 삭제 완료를 알림
        }
      })
      .catch(err => {
        console.error('Failed to delete event:', err);
        alert('Error deleting event');
      });
  };

  return (
    <form onSubmit={handleDelete}>
      <label>
        정말삭제하시나요?
        <input
          type="text"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          disabled
        />
      </label>
      <button type="submit">일정 삭제</button>
    </form>
  );
}

export default DeleteEventForm;
