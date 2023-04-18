const { errorHandler } = require('./ErrorHandler')
const { messagePayload } = require('./CorporateAccountMessage')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

class CorporateAccount {
    static async run(eventObj, destinationName, targetEvent) {
        let outboundMessagePayload = messagePayload.initialize()

        try {
            const destination = await getDestination(destinationName)

            const accountProperties =
                `AccountID,` +
                `ExternalID,` +
                `BusinessPartnerFormattedName,` +
                `LifeCycleStatusCode,` +
                `Defaultstore_KUT,` +
                `ParentAccountID,` +
                `RequestChorus_KUT`

            const addressProperties =
                `CorporateAccountAddress/BillTo,` +
                `CorporateAccountAddress/ShipTo,` +
                `CorporateAccountAddress/HouseNumber,` +
                `CorporateAccountAddress/Street,` +
                `CorporateAccountAddress/AddressLine2,` +
                `CorporateAccountAddress/StreetPostalCode,` +
                `CorporateAccountAddress/City,` +
                `CorporateAccountAddress/CountryCode`

            const salesDataProperties =
                `CorporateAccountSalesData/PaymentMethod_KUT,` +
                `CorporateAccountSalesData/DeliveryMethod_KUT,` +
                `CorporateAccountSalesData/SalesOrganisationID`

            const teamProperties =
                `CorporateAccountTeam/EmployeeID,` +
                `CorporateAccountTeam/MainIndicator,` +
                `CorporateAccountTeam/PartyRoleCode`

            const taxNumberProperties =
                `CorporateAccountTaxNumber/TaxID`

            let apiURL =
                `/sap/c4c/odata/v1/c4codataapi/CorporateAccountCollection?` +
                `$expand=` +
                `CorporateAccountAddress,` +
                `CorporateAccountSalesData,` +
                `CorporateAccountTeam,` +
                `CorporateAccountTaxNumber` +
                `&$filter=ObjectID eq '${eventObj.data['root-entity-id']}'` +
                `&$select=${accountProperties},${addressProperties},${salesDataProperties},${teamProperties},${taxNumberProperties}`

            let response = await executeHttpRequest(
                destination,
                {
                    method: 'get',
                    url: apiURL
                }
            )
            outboundMessagePayload.EventName = 'CorporateAcccount'
            outboundMessagePayload.EventType = targetEvent
            outboundMessagePayload.EventTriggeredOn = eventObj['event-time']
            
            outboundMessagePayload.EventSpecInfo.OriginalEventName = eventObj['event-type']

            const accountCollection = response.data.d.results[0]

            outboundMessagePayload.Entity.AccountId = accountCollection.AccountID
            outboundMessagePayload.Entity.ERPAccountID = accountCollection.ExternalID
            outboundMessagePayload.Entity.AccountName = accountCollection.BusinessPartnerFormattedName
            outboundMessagePayload.Entity.AccountStatus = accountCollection.LifeCycleStatusCode
            outboundMessagePayload.Entity.DefaultStore = accountCollection.Defaultstore_KUT
            outboundMessagePayload.Entity.ClientGroup = accountCollection.ParentAccountID
            outboundMessagePayload.Entity.RequestChorus = accountCollection.RequestChorus_KUT

            if (accountCollection.CorporateAccountAddress.length === 1) {
                const addressCollection = accountCollection.CorporateAccountAddress[0]
                if (addressCollection.BillTo) {
                    outboundMessagePayload.Entity.InvoicingHouseNumber = addressCollection.HouseNumber
                    outboundMessagePayload.Entity.InvoicingAddress1 = addressCollection.Street
                    outboundMessagePayload.Entity.InvoicingAddress2 = addressCollection.AddressLine2
                    outboundMessagePayload.Entity.InvoicingPostalCode = addressCollection.StreetPostalCode
                    outboundMessagePayload.Entity.InvoicingCity = addressCollection.City
                    outboundMessagePayload.Entity.InvoicingCountry = addressCollection.CountryCode
                }

                if (addressCollection.ShipTo) {
                    outboundMessagePayload.Entity.DeliveryHouseNumber = addressCollection.HouseNumber
                    outboundMessagePayload.Entity.DeliveryAddress1 = addressCollection.Street
                    outboundMessagePayload.Entity.DeliveryAddress2 = addressCollection.AddressLine2
                    outboundMessagePayload.Entity.DeliveryPostalCode = addressCollection.StreetPostalCode
                    outboundMessagePayload.Entity.DeliveryCity = addressCollection.City
                    outboundMessagePayload.Entity.DeliveryCountry = addressCollection.CountryCode
                }
            }

            if (accountCollection.CorporateAccountTeam.length === 1) {
                const teamCollection = accountCollection.CorporateAccountTeam[0]
                if ((teamCollection.MainIndcator === true && teamCollection.PartyRoleCode === '142') || teamCollection.PartyRoleCode === '142') {
                    outboundMessagePayload.Entity.SalesRepCode = teamCollection.EmployeeID
                }
            }

            if (accountCollection.CorporateAccountSalesData.length === 1) {
                const salesDataCollection = accountCollection.CorporateAccountSalesData
                outboundMessagePayload.Entity.PaymentMethods = salesDataCollection.PaymentMethod_KUT
                outboundMessagePayload.Entity.DeliveryMethods = salesDataCollection.DeliveryMethod_KUT
                outboundMessagePayload.Entity.OrganisationId = salesDataCollection.SalesOrganisationID
            }

            if (accountCollection.CorporateAccountTaxNumber.length === 1) {
                const taxNumberCollection = accountCollection.CorporateAccountTaxNumber
                outboundMessagePayload.Entity.TaxId = taxNumberCollection.TaxID
            }

            apiURL =
                `/sap/c4c/odata/v1/c4codataapi/BusinessAttributeAssignmentItemCollection?` +
                `&$filter=BusinessPartnerID eq '${accountCollection.AccountID}'` +
                `&$select=BusinessAttributeSetID,BusinessAttributeID,BusinessAttributeValue`

            response = await executeHttpRequest(
                destination,
                {
                    method: 'get',
                    url: apiURL
                }
            )

            if (response.data.d.results.length > 0) {
                const itemCollection = response.data.d.results[0]

                if (itemCollection.BusinessAttributeSetID === 'ZFRL_01' && itemCollection.BusinessAttributeValue === 'Z10401' && itemCollection.BusinessAttributeID === 'Z104') {
                    outboundMessagePayload.Entity.FidelityProgram = 'PackPro'
                } else if (itemCollection.BusinessAttributeValue === 'P30') {
                    outboundMessagePayload.Entity.FidelityProgram = 'PPG'
                }
            }
            return JSON.stringify(outboundMessagePayload)
        }
        catch (err) {
            errorHandler.print(err)
        }
    }
}

module.exports = { CorporateAccount }