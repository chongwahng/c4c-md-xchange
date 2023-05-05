const { errorHandler } = require('./ErrorHandler')
const { messagePayload } = require('./CorporateAccountMessage')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

class CorporateAccount {
    static async run(eventObj, destinationName, targetEvent) {
        let outboundMessagePayload = messagePayload.initialize()

        try {
            const destination = await getDestination(destinationName)
            //console.log(destination.originalProperties)
            const accountProperties =
                `AccountID,` +
                `RoleCode,` +
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
                `CorporateAccountSalesData/SalesOrganisationID,` +
                `CorporateAccountSalesData/DistributionChannelCode,` +
                `CorporateAccountSalesData/DivisionCode`

            const teamProperties =
                `CorporateAccountTeam/EmployeeID,` +
                `CorporateAccountTeam/MainIndicator,` +
                `CorporateAccountTeam/PartyRoleCode`

            const taxNumberProperties =
                `CorporateAccountTaxNumber/TaxID,` +
                `CorporateAccountTaxNumber/CountryCode,` +
                `CorporateAccountTaxNumber/TaxTypeCode`

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

            const accountCollection = response.data.d.results[0]

            outboundMessagePayload.EventName = 'CorporateAccount'
            outboundMessagePayload.EventType = targetEvent
            outboundMessagePayload.EventTriggeredOn = eventObj['event-time']

            outboundMessagePayload.Entity.AccountId = accountCollection.AccountID
            outboundMessagePayload.Entity.Role = accountCollection.RoleCode
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

            for (let team of accountCollection.CorporateAccountTeam.entries()) {
                if ((team[1].MainIndcator === true && team[1].PartyRoleCode === '142') || team[1].PartyRoleCode === '142') {
                    outboundMessagePayload.Entity.SalesRepCode = team[1].EmployeeID
                }
            }

            outboundMessagePayload.EventSpecInfo.OriginalEventName = eventObj['event-type']

            const placeHolder = '_'

            if (accountCollection.CorporateAccountSalesData.length === 0) {
                // no sales area data, just build generic topic string
                outboundMessagePayload.EventSpecInfo.TopicStrings.push(`ppginc/corporateaccount/v1/${placeHolder}/${placeHolder}/${placeHolder}/${placeHolder}`)
            } else {
                let roleCode = (accountCollection.RoleCode === '') ? placeHolder : accountCollection.RoleCode

                for (let salesData of accountCollection.CorporateAccountSalesData.entries()) {
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
                        (salesOrganisationID === 'NLDN' && distributionChannelCode === '01' && divisionCode === 'TR')
                        || (salesOrganisationID === 'AC-FR-SALES-CSG')
                        || (salesOrganisationID === 'TAC')
                        || (salesOrganisationID === 'TAS')
                    ) {
                        if (roleCode === 'CRM000' || roleCode === 'ZSHIP') {
                            topic = `sg/corporateaccount/v1` + `/${salesOrganisationID}` + `/${distributionChannelCode}` + `/${divisionCode}` + `/${roleCode}`
                            outboundMessagePayload.EventSpecInfo.TopicStrings.push(topic)
                        }
                    }

                    topic = `ppginc/corporateaccount/v1` + `/${salesOrganisationID}` + `/${distributionChannelCode}` + `/${divisionCode}` + `/${roleCode}`
                    outboundMessagePayload.EventSpecInfo.TopicStrings.push(topic)
                }
            }

            if (accountCollection.CorporateAccountTaxNumber.length === 1) {
                const taxNumberCollection = accountCollection.CorporateAccountTaxNumber
                if (
                    (taxNumberCollection.TaxTypeCode === '2' && taxNumberCollection.CountryCode === 'FR') ||
                    (
                        taxNumberCollection.TaxTypeCode === '3' &&
                        (
                            taxNumberCollection.CountryCode === 'NL' || taxNumberCollection.CountryCode === 'CZ' ||
                            taxNumberCollection.CountryCode === 'SK' || taxNumberCollection.CountryCode === 'GB'
                        )
                    )
                ) {
                    outboundMessagePayload.Entity.TaxId = taxNumberCollection.TaxID
                    outboundMessagePayload.Entity.CompanyID = taxNumberCollection.TaxID
                }
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

                if (itemCollection.BusinessAttributeSetID === 'ZFRL_01' &&
                    itemCollection.BusinessAttributeValue === 'Z10401' &&
                    itemCollection.BusinessAttributeID === 'Z104') {

                    outboundMessagePayload.Entity.FidelityProgram = 'PackPro'

                } else if (itemCollection.BusinessAttributeValue === 'P30') {
                    outboundMessagePayload.Entity.FidelityProgram = 'PPG'
                }
            }

            return outboundMessagePayload
        }
        catch (err) {
            errorHandler.print(err)
        }
    }
}

module.exports = { CorporateAccount }