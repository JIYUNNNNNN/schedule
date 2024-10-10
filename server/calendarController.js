// import express from 'express';
// import { google } from 'googleapis';

// const router = express.Router();
// const calendar = google.calendar('v3');
// const oauth2Client = new google.auth.OAuth2(
//   process.env.CLIENT_ID,
//   process.env.CLIENT_SECRET,
//   process.env.REDIRECT_URI
// );

// // Add event
// router.post('/add-event', async (req, res) => {
//   try {
//     const { summary, start, end } = req.body;

//     const event = {
//       summary,
//       start: { dateTime: start },
//       end: { dateTime: end },
//     };

//     const response = await calendar.events.insert({
//       auth: oauth2Client,
//       calendarId: 'primary',
//       requestBody: event,
//     });

//     res.status(200).json(response.data);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to add event' });
//   }
// });

// // Delete event
// router.delete('/delete-event/:eventId', async (req, res) => {
//   try {
//     const eventId = req.params.eventId;
//     await calendar.events.delete({
//       auth: oauth2Client,
//       calendarId: 'primary',
//       eventId,
//     });

//     res.status(200).json({ message: 'Event deleted' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to delete event' });
//   }
// });

// // Get all events
// router.get('/events', async (req, res) => {
//   try {
//     const events = await calendar.events.list({
//       auth: oauth2Client,
//       calendarId: 'primary',
//     });

//     res.status(200).json(events.data.items);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch events' });
//   }
// });

// export default router;