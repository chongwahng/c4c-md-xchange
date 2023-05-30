const { errorHandler } = require('./lib/ErrorHandler')
const { messagePayload } = require('./lib/ExceptionMessage')

// Data provider class source file location - mandatory to add here to handle new ClientLink events
const { CorporateAccount } = require('./lib/CorporateAccount')
const { Contact } = require('./lib/Contact')

// Data provider class event type mapping table - mandatory to add here to handle new ClientLink events
const dataProviders = [
    { eventType: 'Account.Root.Created', targetEventType: 'Created', targetEventName: 'CorporateAccount', class: CorporateAccount },
    { eventType: 'Account.Root.Updated', targetEventType: 'Updated', targetEventName: 'CorporateAccount', class: CorporateAccount },
    { eventType: 'SalesData.Root.Created', targetEventType: 'Created', targetEventName: 'CorporateAccount', class: CorporateAccount },
    { eventType: 'SalesData.Root.Updated', targetEventType: 'Updated', targetEventName: 'CorporateAccount', class: CorporateAccount },
    { eventType: 'Contact.Root.Created', targetEventType: 'Created', targetEventName: 'ContactCollection', class: Contact },
    { eventType: 'Contact.Root.Updated', targetEventType: 'Updated', targetEventName: 'ContactCollection', class: Contact }
]

module.exports = async function (srv) {
    if (process.env.C4C_DESTNAME) {
        destinationName = process.env.C4C_DESTNAME
    } else {
        destinationName = 'c4c_ac'
    }

    this.on('EnrichData', async (req) => {
        let eventObj = req.data
        let exceptionTargetObj = messagePayload.initialize()

        if (eventObj) {
            exceptionTargetObj.EventTriggeredOn = eventObj['event-time']
            exceptionTargetObj.EventSpecInfo.OriginalEventName = eventObj['event-type']
            try {
                let idx = dataProviders.findIndex((obj) => obj.eventType === `${eventObj['event-type']}`)

                if (idx === -1) { // cannot find data provider to handle this event, will just return unknown/exception target object
                    return exceptionTargetObj
                } else {
                    return await dataProviders[idx].class.run(eventObj, destinationName, dataProviders[idx].targetEventType, dataProviders[idx].targetEventName, exceptionTargetObj)
                }
            }
            catch (err) {
                errorHandler.print(err)
            }
        }
    })

    this.on('VerifyEventPayload', async (req) => {
        if (req.data) {
            let eventObj = req.data
            console.log(eventObj)
            return eventObj
        }
    })
}