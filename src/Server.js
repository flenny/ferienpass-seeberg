const BOOKINGS_SHEET_NAME = 'Bookings'
const EVENTS_SHEET_NAME = 'Events'
const VOLUNTEERS_SHEET_NAME = 'Volunteers'
const SCRIPT_LOCK_TIMEOUT = 40000
const EVENT_CACHE_IDENTIFIER = 'event-cache'
const BOOKINGS_CACHE_IDENTIFIER = 'bookings-cache'
const CACHE_EXPIRATION_TIMEOUT = 3600
const TIMESTAMP_FORMAT = 'dd.MM.yyyy HH:mm:ss'
const TIME_ZONE = 'Europe/Zurich'
const EVENTS_SHEET_ID_COLUMN = 'A:A'
const EVENTS_SHEET_NAME_COLUMN = 'B:B'
const EVENTS_SHEET_MEETING_POINT_COLUMN = 'D:D'
const EVENTS_SHEET_COSTS_COLUMN = 'E:E'
const EVENTS_SHEET_PERSON_RESPONSIBLE_COLUMN = 'O:O'
const EVENTS_SHEET_PHONE_RESPONSIBLE_COLUMN = 'P:P'
const EVENTS_SHEET_ADDITIONAL_COSTS_COLUMN = 'F:F'
const EVENTS_SHEET_PARTICIPANT_LIMIT_COLUMN = 'K:K'
const BOOKINGS_SHEET_EVENT_ID_COLUMN = 'L'

/**
 * Sets up the script properties, which are used to store the spreadsheet id and the email addresses.
 * This function needs to be executed only once, when the script is first installed.
 * */
function setupScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
    EMAIL_FROM_NAME: 'John Doe',
    EMAIL_FROM_ADDRESS: 'john.doe@example.com',
    EMAIL_SUPPORT_REQUESTS: 'support@example.com',
  }, true)
}

/** Gets the index.html page for every HTTP GET reguest. */
function doGet(request) {
  const template = HtmlService.createTemplateFromFile(request.parameter?.action ?? 'index')
  template.data = {
    reference: request.parameter?.reference,
    bookingId: request.parameter?.bookingId,
    origin: request.parameter?.origin ?? ScriptApp.getService().getUrl(),
  }
  return template.evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

/** Gets the content for the specified @filename. */
function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent() }

/** Gets all the events including updated availability information. */
function getEvents() {
  const result = CacheService.getScriptCache().get(EVENT_CACHE_IDENTIFIER) ??
    updateCache(EVENT_CACHE_IDENTIFIER, EVENTS_SHEET_NAME)
  return Object.values(JSON.parse(result))
}

/** Gets the bookings for the specified reference. */
function getBookings(reference) {
  const result = CacheService.getScriptCache().get(BOOKINGS_CACHE_IDENTIFIER) ??
    updateCache(BOOKINGS_CACHE_IDENTIFIER, BOOKINGS_SHEET_NAME)
  return Object.values(JSON.parse(result))
    .filter(booking => booking?.find(entry => entry === reference))
}

/** Updates all caches (event- and booking cache). */
function updateCaches() {
  updateCache(EVENT_CACHE_IDENTIFIER, EVENTS_SHEET_NAME)
  updateCache(BOOKINGS_CACHE_IDENTIFIER, BOOKINGS_SHEET_NAME)
}

function processForm(formObject) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(SCRIPT_LOCK_TIMEOUT)) throw new Error('Could not obtain lock after 40 seconds.')

  try {
    const spreadsheet = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
    )

    const bookingsSheet = spreadsheet.getSheetByName(BOOKINGS_SHEET_NAME)
    const bookingsSheetHeaders = bookingsSheet.getRange(1, 1, 1, bookingsSheet.getLastColumn()).getValues()[0]
    const bookingsSheetNextRow = bookingsSheet.getLastRow() + 1

    const timestamp = Utilities.formatDate(new Date(), TIME_ZONE, TIMESTAMP_FORMAT)
    const bookingId = createSignature(Date.now(), PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'), 6)
    const reference = createSignature(
      formObject.find(entry => entry[0] === 'email')?.[1],
      PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'))

    const origin = formObject.find(entry => entry[0] === 'origin')?.[1]
    const phone = `'${formObject.find(entry => entry[0] === 'phone')?.[1].trim().replace(/\s+/g, '')}`
    let bookings = []

    // create a full record for every booked event
    formObject.filter(param => param[0] === 'eventId').forEach(param => {
      const [, eventId] = param
      bookings.push(bookingsSheetHeaders.map((header) => {
        if (header === 'timestamp') return timestamp
        else if (header === 'id') return bookingId
        else if (header === 'eventId') return eventId
        else if (header === 'phone') return phone
        else if (header === 'grade') return `${formObject.find(entry => entry[0] === 'grade')?.[1]}. Klasse`
        else if (header === 'eventName') return `=XLOOKUP(INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ID_COLUMN},${EVENTS_SHEET_NAME}!${EVENTS_SHEET_NAME_COLUMN},"")`
        else if (header === 'meetingPoint') return `=XLOOKUP(INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ID_COLUMN},${EVENTS_SHEET_NAME}!${EVENTS_SHEET_MEETING_POINT_COLUMN},"")`
        else if (header === 'waitingList') return `=IF((XLOOKUP(INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ID_COLUMN},${EVENTS_SHEET_NAME}!${EVENTS_SHEET_PARTICIPANT_LIMIT_COLUMN},""))-(COUNTIF(${BOOKINGS_SHEET_EVENT_ID_COLUMN}2:INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())))) < 0, "Ja", "Nein")`
        else if (header === 'costs') return `=XLOOKUP(INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ID_COLUMN},${EVENTS_SHEET_NAME}!${EVENTS_SHEET_COSTS_COLUMN},"")`
        else if (header === 'additionalCosts') return `=XLOOKUP(INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ID_COLUMN},${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ADDITIONAL_COSTS_COLUMN},"")`
        else if (header === 'personResponsible ') return `=XLOOKUP(INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ID_COLUMN},${EVENTS_SHEET_NAME}!${EVENTS_SHEET_PERSON_RESPONSIBLE_COLUMN},"")`
        else if (header === 'phoneResponsible ') return `=XLOOKUP(INDIRECT(CONCATENATE("${BOOKINGS_SHEET_EVENT_ID_COLUMN}",ROW())),${EVENTS_SHEET_NAME}!${EVENTS_SHEET_ID_COLUMN},${EVENTS_SHEET_NAME}!${EVENTS_SHEET_PHONE_RESPONSIBLE_COLUMN},"")`
        else if (header === 'allowParticipantList') return formObject.find(entry => entry[0] === 'allowParticipantList')?.[1] ? 'Ja' : 'Nein'
        else if (header === 'allowPhotos') return formObject.find(entry => entry[0] === 'allowPhotos')?.[1] ? 'Ja' : 'Nein'
        else if (header === 'reference') return reference
        else if (header === 'url') return getStatusUrl(origin, reference)
        else return formObject.find(entry => entry[0] === header)?.[1]
      }))
    })

    bookingsSheet.getRange(bookingsSheetNextRow, 1, bookings.length, bookingsSheetHeaders.length).setValues(bookings)

    // add optional volunteers
    const volunteeringId = formObject.find(entry => entry[0] === 'volunteering')?.[1]
    if (volunteeringId) {
      const volunteersSheet = spreadsheet.getSheetByName(VOLUNTEERS_SHEET_NAME)
      const volunteersSheetHeaders = volunteersSheet.getRange(1, 1, 1, volunteersSheet.getLastColumn()).getValues()[0]
      const volunteersSheetNextRow = volunteersSheet.getLastRow() + 1

      volunteersSheet.getRange(volunteersSheetNextRow, 1, 1, volunteersSheetHeaders.length).setValues(
        [volunteersSheetHeaders.map((header) => {
          if (header === 'phone') return phone
          else if (header === 'option') return volunteeringId
          else if (header === 'volunteering') return `=LOOKUP(INDIRECT(CONCATENATE("B",ROW())),Volunteering!A:A,Volunteering!B:B)`
          else return formObject.find(entry => entry[0] === header)?.[1]
        })]
      )
    }

    // update caches
    CacheService.getScriptCache().put(EVENT_CACHE_IDENTIFIER, getDataFromSheet(spreadsheet, EVENTS_SHEET_NAME), CACHE_EXPIRATION_TIMEOUT)
    CacheService.getScriptCache().put(BOOKINGS_CACHE_IDENTIFIER, getDataFromSheet(spreadsheet, BOOKINGS_SHEET_NAME), CACHE_EXPIRATION_TIMEOUT)

    // optional machen, oder try catch
    // unhandled exceptions per e-mail
    const emailTo = formObject.find(entry => entry[0] === 'email')?.[1]
    const firstName = formObject.find(entry => entry[0] === 'firstName')?.[1]
    const htmlBody = `
    <html>
      <body style="font-size: 16px;">
        <img src="https://booking.ferienpass-seeberg.ch/ferienpass.webp" alt="Logo Ferienpass Seeberg" style="max-width: 12em;">
        <p style="font-size: 20px;">Hallo ${firstName} 👋🏻</p>
        <p>Vielen herzlichen Dank für deine Anmeldung beim Ferienpass Seeberg. Wir freuen uns sehr, dass du dabei bist 🥳.</p>
        <p>Du kannst <a href="${getStatusUrl(origin, reference, bookingId)}">hier</a> jederzeit den Status deiner gebuchten Kurse überprüfen.
        Die Rechnung, unter Berücksichtigung der im Programmheft beschriebenen Familienpauschale, wie auch die definitive Kurseinteilung
        erhältst du nach Anmeldeschluss im Juni.</p>
        <p><a href="${getPreFilledFormUrl(origin, bookingId)}" target="_top">Hier</a> kannst du weitere Kurse buchen.</p>
        <p>Tschüss und bis bald</p>
        <p>Dein Ferienpass Seeberg Team</p>
      </body>
    </html>
    `

    const textBody = `
      Hallo ${firstName}

      Vielen herzlichen Dank für deine Anmeldung beim Ferienpass Seeberg. Wir freuen uns sehr, dass du dabei bist.

      Unter dem nachfolgenden Link kannst du jederzeit den Status deiner gebuchten Kurse ueberpruefen.

      ${getStatusUrl(origin, reference, bookingId)}

      Die Rechnung, unter Beruecksichtigung der im Programmheft beschriebenen Familienpauschale, wie auch die definitive Kurseinteilung
      erhaeltst du nach Anmeldeschluss im Juni.

      Hier kannst du weitere Kurse buchen.

      ${getPreFilledFormUrl(origin, bookingId)}

      Tschuess und bis bald.
      Dein Ferienpass Seeberg Team
    `
    sendMail({
      to: emailTo,
      emailFrom: PropertiesService.getScriptProperties().getProperty('EMAIL_FROM_ADDRESS'),
      nameFrom: PropertiesService.getScriptProperties().getProperty('EMAIL_FROM_NAME'),
      subject: "Deine Anmeldung beim Ferienpass Seeberg 🎉",
      textBody: textBody,
      htmlBody: htmlBody,
    })

    // return redirect url
    return `${origin}?action=success&bookingId=${bookingId}`
  }
  catch (error) {
    errorMsg = `${error}<br>${error.stack}<br><p>RequestData:</p><code>${formObject}</code>`
    sendMail({
      to: PropertiesService.getScriptProperties().getProperty('EMAIL_SUPPORT_REQUESTS'),
      emailFrom: PropertiesService.getScriptProperties().getProperty('EMAIL_FROM_ADDRESS'),
      nameFrom: PropertiesService.getScriptProperties().getProperty('EMAIL_FROM_NAME'),
      subject: "Fehler im Ferienpass Backend 🙈",
      textBody: errorMsg,
      htmlBody: errorMsg,
    })

    throw error
  }
  finally { lock.releaseLock() }
}

const getDataFromSheet = (spreadsheet, sheetName) => {
  const sheet = spreadsheet.getSheetByName(sheetName)
  let numRows = sheet.getLastRow() - 1
  if (numRows === 0) numRows = 1
  return JSON.stringify(
    sheet.getRange(2, 1, numRows, sheet.getLastColumn()).getValues()
  )
}

/** Creates a custom signature for the given value and key. */
const createSignature = (value, key, length) => {
  const signature = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_MD5,
    value,
    key,
    Utilities.Charset.US_ASCII);
  return Utilities.base64EncodeWebSafe(signature)
    .replace(/[_\-=]+/g, '')
    .substring(0, length ?? 12)
}

const updateCache = (identifier, sheetName) => {
  const label = `updateCache-${identifier}`
  console.time(label)
  const lock = LockService.getScriptLock()
  const hasLock = lock.tryLock(SCRIPT_LOCK_TIMEOUT)
  if (!hasLock) { throw new Error('Could not obtain lock after 40 seconds.') }
  try {
    const spreadsheet = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'))
    const result = getDataFromSheet(spreadsheet, sheetName)
    CacheService.getScriptCache().put(identifier, result, CACHE_EXPIRATION_TIMEOUT)
    return result
  }
  catch (error) { throw error }
  finally {
    lock.releaseLock()
    console.timeEnd(label)
  }
}

// Get the status url with optional bookingId
const getStatusUrl = (baseUrl, reference, bookingId) => {
  let result = `${baseUrl}?action=status&reference=${reference}`
  if (bookingId) result += `&bookingId=${bookingId}`
  return result
}

// Get the pre-filled form url
const getPreFilledFormUrl = (baseUrl, bookingId) => `${baseUrl}?bookingId=${bookingId}`

// Send an email
const sendMail = email => Gmail.Users.Messages.send({ raw: convertToGmailMessage(email) }, "me");
const convertToGmailMessage = ({ to, emailFrom, nameFrom, subject, textBody, htmlBody }) => {
  const boundary = "boundaryboundary";
  const mailData = [
    `MIME-Version: 1.0`,
    `To: ${to}`,
    nameFrom && emailFrom ? `From: "${nameFrom}" <${emailFrom}>` : "",
    `Subject: =?UTF-8?B?${Utilities.base64Encode(
      subject,
      Utilities.Charset.UTF_8
    )}?=`,
    `Content-Type: multipart/alternative; boundary=${boundary}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    textBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Utilities.base64Encode(htmlBody, Utilities.Charset.UTF_8),
    ``,
    `--${boundary}--`,
  ].join("\r\n");
  return Utilities.base64EncodeWebSafe(mailData);
};
