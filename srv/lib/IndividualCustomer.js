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
                `RoleCode,` +
                `ExternalID,` +
                `FormattedName,` +
                `LifeCycleStatusCode,` +
                `LifeCycleStatusCodeText,` +
                `Defaultstore_KUT,` +
                `FirstName,` +
                `LastName,` +
                `Email,` +
                `Phone,` +
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
                `IndividualCustomerSalesData/SalesOrganisationID,` +
                `IndividualCustomerSalesData/DistributionChannelCode,` +
                `IndividualCustomerSalesData/DivisionCode`

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
                outboundMessagePayload.Entity.FirstName = customerCollection.FirstName
                outboundMessagePayload.Entity.LastName = customerCollection.LastName
                outboundMessagePayload.Entity.Email = customerCollection.Email
                outboundMessagePayload.Entity.Phone = customerCollection.Phone
                outboundMessagePayload.Entity.Status = customerCollection.LifeCycleStatusCodeText

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

                if (customerCollection.IndividualCustomerSalesData.length === 0) {
                    // no sales area data, just build generic topic string
                    outboundMessagePayload.EventSpecInfo.TopicStrings.push(`ppginc/individualcustomer/v1/${placeHolder}/${placeHolder}/${placeHolder}/${placeHolder}`)
                } else {
                    let roleCode = (customerCollection.RoleCode === '') ? placeHolder : customerCollection.RoleCode

                    for (let salesData of customerCollection.IndividualCustomerSalesData.entries()) {
                        let topic = ''

                        outboundMessagePayload.Entity.PaymentMethods = salesData[1].PaymentMethod_KUT
                        outboundMessagePayload.Entity.DeliveryMethods = salesData[1].DeliveryMethod_KUT
                        outboundMessagePayload.Entity.OrganisationId = salesData[1].SalesOrganisationID
                        outboundMessagePayload.Entity.DistributionChannel = salesData[1].DistributionChannelCode
                        outboundMessagePayload.Entity.Division = salesData[1].DivisionCode

                        let salesOrganisationID = (salesData[1].SalesOrganisationID === '') ? placeHolder : salesData[1].SalesOrganisationID
                        let distributionChannelCode = (salesData[1].DistributionChannelCode === '') ? placeHolder : salesData[1].DistributionChannelCode
                        let divisionCode = (salesData[1].DivisionCode === '') ? placeHolder : salesData[1].DivisionCode

                        if (
                            (salesOrganisationID === 'NLDN' && distributionChannelCode === '01' && divisionCode === 'TR') ||
                            (salesOrganisationID === 'G3TR' && distributionChannelCode === '01' && divisionCode === 'TR')
                            || (salesOrganisationID === 'AC-FR-SALES-CSG')
                            || (salesOrganisationID === 'TAC')
                            || (salesOrganisationID === 'TAS')
                        ) {
                            if (roleCode === 'CRM000' || roleCode === 'ZSHIP') {    // for SG scenario, we need to include additional topic on top of generic topic
                                topic = `sg/individualcustomer/v1` + `/${salesOrganisationID}` + `/${distributionChannelCode}` + `/${divisionCode}` + `/${roleCode}`
                                outboundMessagePayload.EventSpecInfo.TopicStrings.push(topic)
                            }
                        }

                        topic = `ppginc/individualcustomer/v1` + `/${salesOrganisationID}` + `/${distributionChannelCode}` + `/${divisionCode}` + `/${roleCode}`
                        outboundMessagePayload.EventSpecInfo.TopicStrings.push(topic)
                    }
                }

                for (let taxNumberCollection of customerCollection.IndividualCustomerTaxNumber.entries()) {
                    if (
                        (taxNumberCollection[1].TaxTypeCode === '2' && taxNumberCollection[1].CountryCode === 'FR') ||
                        (
                            taxNumberCollection[1].TaxTypeCode === '3' &&
                            (
                                taxNumberCollection[1].CountryCode === 'NL' ||
                                taxNumberCollection[1].CountryCode === 'CZ' ||
                                taxNumberCollection[1].CountryCode === 'SK'
                            )
                        )
                    ) {
                        outboundMessagePayload.Entity.TaxId = taxNumberCollection[1].TaxID
                        outboundMessagePayload.Entity.CompanyID = taxNumberCollection[1].TaxID
                        break   // stop looking when found the 1st suitable TaxID
                    }
                }
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