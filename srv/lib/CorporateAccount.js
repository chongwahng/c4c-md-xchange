const { errorHandler } = require('./ErrorHandler')
const { messagePayload } = require('./CorporateAccountMessage')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

class CorporateAccount {
    static async run(eventObj, destinationName, targetEvent, exceptionTargetObj) {
        const placeHolder = '_'

        let objectID = ''
        let response = ''
        let apiURL = ''

        let outboundMessagePayload = messagePayload.initialize()

        try {
            const destination = await getDestination(destinationName)

            // main event is not triggered for CorporateAccount as root but instead it's SalesData, as such, needs to look backward for CorporateAccount object ID
            if (eventObj['event-type'] === 'SalesData.Root.Updated' || eventObj['event-type'] === 'SalesData.Root.Created') {
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

                objectID = response.data.d.results[0].ParentObjectID

            } else objectID = eventObj.data['root-entity-id']

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

            apiURL =
                `/sap/c4c/odata/v1/c4codataapi/CorporateAccountCollection?` +
                `$expand=` +
                `CorporateAccountAddress,` +
                `CorporateAccountSalesData,` +
                `CorporateAccountTeam,` +
                `CorporateAccountTaxNumber` +
                `&$filter=ObjectID eq '${objectID}'` +
                `&$select=${accountProperties},${addressProperties},${salesDataProperties},${teamProperties},${taxNumberProperties}`

            response = await executeHttpRequest(
                destination,
                {
                    method: 'get',
                    url: apiURL
                }
            )

            if (response.data.d.results.length > 0) {
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

                for (let address of accountCollection.CorporateAccountAddress.entries()) {
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

                for (let team of accountCollection.CorporateAccountTeam.entries()) {
                    if ((team[1].MainIndcator === true && team[1].PartyRoleCode === '142') || team[1].PartyRoleCode === '142') {
                        outboundMessagePayload.Entity.SalesRepCode = team[1].EmployeeID
                    }
                }

                outboundMessagePayload.EventSpecInfo.OriginalEventName = eventObj['event-type']

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
                            if (roleCode === 'CRM000' || roleCode === 'ZSHIP') {    // for SG scenario, we need to include additional topic on top of generic topic
                                topic = `sg/corporateaccount/v1` + `/${salesOrganisationID}` + `/${distributionChannelCode}` + `/${divisionCode}` + `/${roleCode}`
                                outboundMessagePayload.EventSpecInfo.TopicStrings.push(topic)
                            }
                        }

                        topic = `ppginc/corporateaccount/v1` + `/${salesOrganisationID}` + `/${distributionChannelCode}` + `/${divisionCode}` + `/${roleCode}`
                        outboundMessagePayload.EventSpecInfo.TopicStrings.push(topic)
                    }
                }

                if (accountCollection.CorporateAccountTaxNumber.length === 1) {
                    const taxNumberCollection = accountCollection.CorporateAccountTaxNumber[0]
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

module.exports = { CorporateAccount }