const { errorHandler } = require('./ErrorHandler')
const { messagePayload } = require('./IndividualCustomerMessage')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

class IndividualCustomer {
    static async run(eventObj, destinationName, targetEventType, targetEventName, targetObjectName, exceptionTargetObj) {
        const placeHolder = '_'

        let response = ''
        let apiURL = ''

        let outboundMessagePayload = messagePayload.initialize()

        try {
            const destination = await getDestination(destinationName)

            const customerProperties =
                `CustomerID,` +
                `ExternalID,` +
                `FormattedName,` +
                `LifeCycleStatusCode,` +
                `LifeCycleStatusCodeText,` +
                `Defaultstore_KUT,` +
                `FirstName,` +
                `LastName,` +
                `Email,` +
                `Phone,` +
                `Ecommerceenabled_KUT,` +
                `RoleCodeText`

            const addressProperties =
                `IndividualCustomerAddress/BillTo,` +
                `IndividualCustomerAddress/ShipTo,` +
                `IndividualCustomerAddress/HouseNumber,` +
                `IndividualCustomerAddress/Street,` +
                `IndividualCustomerAddress/AddressLine2,` +
                `IndividualCustomerAddress/StreetPostalCode,` +
                `IndividualCustomerAddress/City,` +
                `IndividualCustomerAddress/CountryCode`

            const salesDataProperties =
                `IndividualCustomerSalesData/PaymentMethod_KUT,` +
                `IndividualCustomerSalesData/DeliveryMethod_KUT,` +
                `IndividualCustomerSalesData/SalesOrganisationID`

            const taxNumberProperties =
                `IndividualCustomerTaxNumber/TaxID,` +
                `IndividualCustomerTaxNumber/CountryCode,` +
                `IndividualCustomerTaxNumber/TaxTypeCode`

            apiURL =
                `/sap/c4c/odata/v1/c4codataapi/IndividualCustomerCollection?` +
                `$expand=` +
                `IndividualCustomerAddress,` +
                `IndividualCustomerSalesData,` +
                `IndividualCustomerTaxNumber` +
                `&$filter=ObjectID eq '${eventObj.data['root-entity-id']}'` +
                `&$select=${customerProperties},${addressProperties},${salesDataProperties},${taxNumberProperties}`

            response = await executeHttpRequest(
                destination,
                {
                    method: 'get',
                    url: apiURL
                }
            )

            if (response.data.d.results.length > 0) {
                const customerCollection = response.data.d.results[0]

                outboundMessagePayload.EventName = targetEventName
                outboundMessagePayload.EventType = targetEventType
                outboundMessagePayload.ObjectName = targetObjectName
                outboundMessagePayload.EventTriggeredOn = eventObj['event-time']

                outboundMessagePayload.Entity.AccountId = customerCollection.AccountID
                outboundMessagePayload.Entity.ERPAccountID = customerCollection.ExternalID
                outboundMessagePayload.Entity.AccountName = customerCollection.FormattedName
                outboundMessagePayload.Entity.AccountStatus = customerCollection.LifeCycleStatusCode
                outboundMessagePayload.Entity.DefaultStore = customerCollection.Defaultstore_KUT

                for (let address of customerCollection.IndividualCustomerAddress.entries()) {
                    if (address[1].BillTo) {
                        outboundMessagePayload.Entity.InvoicingHouseNumber = address[1].HouseNumber
                        outboundMessagePayload.Entity.InvoicingAddress1 = address[1].Street
                        outboundMessagePayload.Entity.InvoicingAddress2 = address[1].AddressLine2
                        outboundMessagePayload.Entity.InvoicingPostalCode = address[1].StreetPostalCode
                        outboundMessagePayload.Entity.InvoicingCity = address[1].City
                        outboundMessagePayload.Entity.InvoicingCountry = address[1].CountryCode
                    }
                    if (address[1].ShipTo) {
                        outboundMessagePayload.Entity.DeliveryHouseNumber = address[1].HouseNumber
                        outboundMessagePayload.Entity.DeliveryAddress1 = address[1].Street
                        outboundMessagePayload.Entity.DeliveryAddress2 = address[1].AddressLine2
                        outboundMessagePayload.Entity.DeliveryPostalCode = address[1].StreetPostalCode
                        outboundMessagePayload.Entity.DeliveryCity = address[1].City
                        outboundMessagePayload.Entity.DeliveryCountry = address[1].CountryCode
                    }
                }

                outboundMessagePayload.EventSpecInfo.OriginalEventName = eventObj['event-type']
            } else {
                outboundMessagePayload = exceptionTargetObj
            }

            return outboundMessagePayload
        }
        catch (err) {
            errorHandler.print(err)
        }
    }
}

module.exports = { IndividualCustomer }