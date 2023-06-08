const { errorHandler } = require('./ErrorHandler')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

const { CorporateAccount } = require('./CorporateAccount')
const { IndividualCustomer } = require('./IndividualCustomer')

// SalesData is the 1st level data provider class that determines the 2nd level data provider class for further processing - either account or customer
class SalesData {
    static async run(eventObj, destinationName, targetEventType, targetEventName, targetObjectName, exceptionTargetObj) {
        let response = ''
        let apiURL = ''
        let outboundMessagePayload = ''

        try {
            const destination = await getDestination(destinationName)

            apiURL =
                `/sap/c4c/odata/v1/c4codataapi/CorporateAccountSalesDataCollection?` +
                `&$filter=ObjectID eq '${eventObj.data['root-entity-id']}'` +
                `&$select=ParentObjectID`

            response = await executeHttpRequest(
                destination,
                {
                    method: 'get',
                    url: apiURL
                }
            )

            // If event is triggered for account sales entity, then 2nd level data provider class is CorporateAccount
            if (response.data.d.results.length === 1) {
                eventObj.data['root-entity-id'] = response.data.d.results[0].ParentObjectID
                targetObjectName = 'CorporateAccount'

                outboundMessagePayload = await CorporateAccount.run(
                    eventObj,
                    destinationName,
                    targetEventType,
                    targetEventName,
                    targetObjectName,
                    exceptionTargetObj
                )
            } else { 
                apiURL =
                    `/sap/c4c/odata/v1/c4codataapi/IndividualCustomerSalesDataCollection?` +
                    `&$filter=ObjectID eq '${eventObj.data['root-entity-id']}'` +
                    `&$select=ParentObjectID`

                response = await executeHttpRequest(
                    destination,
                    {
                        method: 'get',
                        url: apiURL
                    }
                )

                // Otherwise, check customer sales entity
                if (response.data.d.results.length === 1) {
                    eventObj.data['root-entity-id'] = response.data.d.results[0].ParentObjectID
                    targetObjectName = 'IndividualCustomer'

                    outboundMessagePayload = await IndividualCustomer.run(
                        eventObj,
                        destinationName,
                        targetEventType,
                        targetEventName,
                        targetObjectName,
                        exceptionTargetObj
                    )    
                }
            }

            return outboundMessagePayload
        }
        catch (err) {
            errorHandler.print(err)
        }
    }
}

module.exports = { SalesData }