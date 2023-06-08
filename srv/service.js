const { errorHandler } = require('./lib/ErrorHandler')
const { messagePayload } = require('./lib/ExceptionMessage')

// Data provider class source file location - mandatory to add here to handle new ClientLink events
const { CorporateAccount } = require('./lib/CorporateAccount')
const { Contact } = require('./lib/Contact')
const { SalesData } = require('./lib/SalesData')
const { IndividualCustomer } = require('./lib/IndividualCustomer')

// Data provider class and event type mapping table - mandatory to add here to handle new ClientLink events
const dataProviders = [
    { eventType: 'Account.Root.Created', targetEventType: 'Created', targetEventName: 'Account.Root', targetObjectName: 'CorporateAccount', class: CorporateAccount },
    { eventType: 'Account.Root.Updated', targetEventType: 'Updated', targetEventName: 'Account.Root', targetObjectName: 'CorporateAccount', class: CorporateAccount },
    { eventType: 'SalesData.Root.Created', targetEventType: 'Created', targetEventName: 'SalesData.Root', targetObjectName: '', class: SalesData },
    { eventType: 'SalesData.Root.Updated', targetEventType: 'Updated', targetEventName: 'SalesData.Root', targetObjectName: '', class: SalesData },
    { eventType: 'Contact.Root.Created', targetEventType: 'Created', targetEventName: 'Contact.Root', targetObjectName: 'Contact', class: Contact },
    { eventType: 'Contact.Root.Updated', targetEventType: 'Updated', targetEventName: 'Contact.Root', targetObjectName: 'Contact', class: Contact },
    { eventType: 'BusinessPartnerRelationship.Root.Created', targetEventType: 'Created', targetEventName: 'BusinessPartnerRelationship.Root', targetObjectName: 'Contact', class: Contact },
    { eventType: 'BusinessPartnerRelationship.Root.Updated', targetEventType: 'Updated', targetEventName: 'BusinessPartnerRelationship.Root', targetObjectName: 'Contact', class: Contact },
    { eventType: 'BusinessPartnerRelationship.Root.Deleted', targetEventType: 'Deleted', targetEventName: 'BusinessPartnerRelationship.Root', targetObjectName: 'Contact', class: Contact },
    { eventType: 'IndividualCustomer.Root.Created', targetEventType: 'Created', targetEventName: 'IndividualCustomer.Root', targetObjectName: 'IndividualCustomer', class: IndividualCustomer },
    { eventType: 'IndividualCustomer.Root.Updated', targetEventType: 'Updated', targetEventName: 'IndividualCustomer.Root', targetObjectName: 'IndividualCustomer', class: IndividualCustomer }
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
                    return await dataProviders[idx].class.run(
                        eventObj,
                        destinationName,
                        dataProviders[idx].targetEventType,
                        dataProviders[idx].targetEventName,
                        dataProviders[idx].targetObjectName,
                        exceptionTargetObj
                    )
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