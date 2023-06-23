const { errorHandler } = require('./ErrorHandler')
const { messagePayload } = require('./CorporateAccountMessage')

const { executeHttpRequest, getDestination } = require('@sap-cloud-sdk/core')

class CorporateAccount {
    static async run(eventObj, destinationName, targetEventType, targetEventName, targetObjectName, exceptionTargetObj) {
        const placeHolder = '_'

        let response = ''
        let apiURL = ''

        let outboundMessagePayload = messagePayload.initialize()

        try {
            const destination = await getDestination(destinationName)

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
                `&$filter=ObjectID eq '${eventObj.data['root-entity-id']}'` +
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

                outboundMessagePayload.EventName = targetEventName
                outboundMessagePayload.EventType = targetEventType
                outboundMessagePayload.ObjectName = targetObjectName
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

                // SalesRepCode determination logic
                // 1st rule: MainIndicator == true && PartyRoleCode == 142 ==> use it
                // 2nd rule: if == null then ==> first obj. with PartyRoleCode == 142
                let empID1stPriority
                let empID2ndPriority

                for (let team of accountCollection.CorporateAccountTeam.entries()) {
                    if (!empID1stPriority && team[1].MainIndicator === true && team[1].PartyRoleCode === '142') {
                        empID1stPriority = team[1].EmployeeID
                        break  // 1st rule met, stop looking
                    }
                    else if (team[1].PartyRoleCode === '142' && !empID2ndPriority) {
                        empID2ndPriority = team[1].EmployeeID
                    }
                }

                if (empID1stPriority) {
                    outboundMessagePayload.Entity.SalesRepCode = empID1stPriority
                } else if (empID2ndPriority) {
                    outboundMessagePayload.Entity.SalesRepCode = empID2ndPriority
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
                            (salesOrganisationID === 'NLDN' && distributionChannelCode === '01' && divisionCode === 'TR') ||
                            (salesOrganisationID === 'G3TR' && distributionChannelCode === '01' && divisionCode === 'TR')
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

                for (let taxNumberCollection of accountCollection.CorporateAccountTaxNumber.entries()) {
                    if (
                        (taxNumberCollection[1].TaxTypeCode === '2' && taxNumberCollection[1].CountryCode === 'FR') ||
                        (
                            taxNumberCollection[1].TaxTypeCode === '3' &&
                            (
                                taxNumberCollection[1].CountryCode === 'NL' ||
                                taxNumberCollection[1].CountryCode === 'CZ' ||
                                taxNumberCollection[1].CountryCode === 'SK' ||
                                taxNumberCollection[1].CountryCode === 'GB' ||
                                taxNumberCollection[1].CountryCode === 'UK'
                            )
                        )
                    ) {
                        outboundMessagePayload.Entity.CompanyID = taxNumberCollection[1].TaxID
                    }

                    if (taxNumberCollection[1].TaxTypeCode === '1') {
                        outboundMessagePayload.Entity.TaxId = taxNumberCollection[1].TaxID
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