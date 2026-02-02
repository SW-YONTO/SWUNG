# SWUNGv2 - Full Test Flow

## Prerequisites

- Server running at `http://localhost:3000`
- Already authenticated with GitHub

---

## Test 1: Chat Interface Basic

| Step | Action                              | Expected Result                                  |
| ---- | ----------------------------------- | ------------------------------------------------ |
| 1.1  | Navigate to `http://localhost:3000` | Chat page loads with "Hello! I'm SWUNG" greeting |
| 1.2  | Type "Hi" and press Enter           | User message appears, AI responds with greeting  |
| 1.3  | Check mic button                    | Click mic button, voice visualizer appears       |
| 1.4  | Click send button while recording   | Recording stops, transcribed text submits        |

---

## Test 2: Create Events

| Step | Action                                                  | Expected Result                           |
| ---- | ------------------------------------------------------- | ----------------------------------------- |
| 2.1  | Type "Create an event for team meeting tomorrow at 3pm" | Event card appears with title, date, time |
| 2.2  | Type "Schedule a dentist appointment on Feb 5 at 10am"  | Event card shows with correct date        |
| 2.3  | Click event card                                        | Event modal opens with full details       |
| 2.4  | Check event has edit button                             | Pencil icon visible on card               |

---

## Test 3: Read Events

| Step | Action                               | Expected Result                      |
| ---- | ------------------------------------ | ------------------------------------ |
| 3.1  | Type "What are my events?"           | AI lists events, shows schedule card |
| 3.2  | Type "Show my schedule for tomorrow" | AI shows tomorrow's events           |
| 3.3  | Type "Do I have anything on Feb 5?"  | AI responds with Feb 5 events        |

---

## Test 4: Update Events

| Step | Action                                   | Expected Result                         |
| ---- | ---------------------------------------- | --------------------------------------- |
| 4.1  | Click edit button on event card          | Event modal opens                       |
| 4.2  | Type "change time to 5pm" in modal input | Modal shows chat response, time updates |
| 4.3  | Type "postpone by 1 hour"                | Event time shifts by 1 hour             |
| 4.4  | Click Postpone quick action button       | Input populates with postpone text      |

---

## Test 5: Delete Events

| Step | Action                               | Expected Result                |
| ---- | ------------------------------------ | ------------------------------ |
| 5.1  | Open event modal, click trash button | Delete confirmation appears    |
| 5.2  | Click "Cancel"                       | Modal stays open               |
| 5.3  | Click trash again, then "Delete"     | Event deleted, success message |
| 5.4  | Type "Delete my dentist appointment" | AI confirms deletion           |

---

## Test 6: Create Alarms

| Step | Action                               | Expected Result                  |
| ---- | ------------------------------------ | -------------------------------- |
| 6.1  | Type "Set an alarm for 7am tomorrow" | Alarm card appears with ⏰ emoji |
| 6.2  | Type "Remind me to call mom at 6pm"  | Alarm created with message       |
| 6.3  | Check alarm card has edit button     | Pencil icon visible              |

---

## Test 7: Update/Delete Alarms

| Step | Action                        | Expected Result    |
| ---- | ----------------------------- | ------------------ |
| 7.1  | Click alarm card              | Alarm modal opens  |
| 7.2  | Type "change to 8am" in modal | Alarm time updates |
| 7.3  | Click trash button, confirm   | Alarm deleted      |

---

## Test 8: Calendar Page

| Step | Action                        | Expected Result                |
| ---- | ----------------------------- | ------------------------------ |
| 8.1  | Click calendar icon in header | Navigate to `/calendar`        |
| 8.2  | Check calendar grid displays  | Month view with dates visible  |
| 8.3  | Dates with events highlighted | Events shown on calendar dates |
| 8.4  | Click on event in calendar    | Event detail modal opens       |
| 8.5  | Navigate months (prev/next)   | Calendar updates correctly     |

---

## Test 9: Todo Page

| Step | Action                                 | Expected Result                  |
| ---- | -------------------------------------- | -------------------------------- |
| 9.1  | Click todo icon (next to calendar)     | Navigate to `/todos`             |
| 9.2  | Page shows task list                   | Existing tasks displayed         |
| 9.3  | Type "Add task: buy groceries" in chat | Task created, appears in list    |
| 9.4  | Type "Complete buy groceries task"     | Task marked as done              |
| 9.5  | Check completed tasks section          | Completed tasks shown separately |

---

## Test 10: Settings Page

| Step | Action                   | Expected Result               |
| ---- | ------------------------ | ----------------------------- |
| 10.1 | Click user/settings icon | Settings modal or page opens  |
| 10.2 | User info displayed      | GitHub username, avatar shown |
| 10.3 | Logout button present    | Click logs out user           |

---

## Test 11: Chat History Persistence

| Step | Action                          | Expected Result                  |
| ---- | ------------------------------- | -------------------------------- |
| 11.1 | Create some messages and events | All appear correctly             |
| 11.2 | Refresh page (F5)               | Chat history loads from database |
| 11.3 | Previous messages visible       | All messages and cards restored  |
| 11.4 | User stays logged in            | No re-authentication required    |

---

## Test 12: Error Handling

| Step | Action                    | Expected Result            |
| ---- | ------------------------- | -------------------------- |
| 12.1 | Type nonsense "asdfghjkl" | AI responds gracefully     |
| 12.2 | Create event without date | AI uses default (tomorrow) |
| 12.3 | Access invalid URL        | 404 error page shows       |

---

## Test Summary Checklist

- [ ] Chat basic functionality
- [ ] Event CRUD (Create, Read, Update, Delete)
- [ ] Alarm CRUD
- [ ] Calendar page navigation
- [ ] Todo page functionality
- [ ] Settings/User page
- [ ] Chat history persistence
- [ ] Auto-login on server restart
- [ ] Error handling
