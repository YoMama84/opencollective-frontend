import React from 'react';
import PropTypes from 'prop-types';
import { InfoCircle } from '@styled-icons/boxicons-regular/InfoCircle';
import { themeGet } from '@styled-system/theme-get';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';

import { formatAccountName } from '../../lib/collective.lib';
import { CollectiveType } from '../../lib/constants/collectives';
import expenseStatus from '../../lib/constants/expense-status';
import expenseTypes from '../../lib/constants/expenseTypes';
import { INVITE, PayoutMethodType, VIRTUAL_CARD } from '../../lib/constants/payout-method';

import Avatar from '../Avatar';
import Container from '../Container';
import FormattedMoneyAmount from '../FormattedMoneyAmount';
import { Box, Flex } from '../Grid';
import PrivateInfoIcon from '../icons/PrivateInfoIcon';
import LinkCollective from '../LinkCollective';
import LoadingPlaceholder from '../LoadingPlaceholder';
import LocationAddress from '../LocationAddress';
import StyledLink from '../StyledLink';
import StyledTooltip from '../StyledTooltip';
import { H4, P, Span } from '../Text';

import PayoutMethodData from './PayoutMethodData';
import PayoutMethodTypeWithIcon from './PayoutMethodTypeWithIcon';

const CreatedByUserLink = ({ account }) => {
  return (
    <LinkCollective collective={account}>
      <Span color="black.800" fontWeight={500} textDecoration="none">
        {account ? account.name : <FormattedMessage id="profile.incognito" defaultMessage="Incognito" />}
      </Span>
    </LinkCollective>
  );
};

CreatedByUserLink.propTypes = {
  account: PropTypes.object,
};

const PrivateInfoColumn = styled(Box).attrs({ mx: [0, '8px'], flexBasis: [0, '200px'] })`
  margin-top: 42px;
  padding-top: 16px;
  border-top: 1px solid ${themeGet('colors.black.300')};
  ${({ borderless }) => (borderless ? 'border-top: none; padding-top: 0; margin-top: 0;' : '')}
  flex: 1 1;
  min-width: 200px;
`;

const PrivateInfoColumnHeader = styled(H4).attrs({
  fontSize: '10px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  color: 'black.500',
  mb: 2,
  letterSpacing: 0,
  lineHeight: '15px',
})``;

const PayeeTotalPayoutSumTooltip = ({ stats }) => {
  const currentYear = new Date().getFullYear().toString();
  return (
    <StyledTooltip
      content={() => (
        <FormattedMessage
          defaultMessage="Total expense payouts ({currentYear}): Invoices: {totalPaidInvoices}; Receipts: {totalPaidReceipts}; Grants: {totalPaidGrants}"
          values={{
            totalPaidInvoices: (
              <FormattedMoneyAmount
                amount={stats.totalPaidInvoices.valueInCents}
                currency={stats.totalPaidInvoices.currency}
                precision={2}
                amountStyles={null}
              />
            ),
            totalPaidReceipts: (
              <FormattedMoneyAmount
                amount={stats.totalPaidReceipts.valueInCents}
                currency={stats.totalPaidReceipts.currency}
                precision={2}
                amountStyles={null}
              />
            ),
            totalPaidGrants: (
              <FormattedMoneyAmount
                amount={stats.totalPaidGrants.valueInCents}
                currency={stats.totalPaidGrants.currency}
                precision={2}
                amountStyles={null}
              />
            ),
            currentYear: <Span>{currentYear}</Span>,
          }}
        />
      )}
    >
      <InfoCircle size={16} />
    </StyledTooltip>
  );
};

const ExpensePayeeDetails = ({ expense, host, isLoading, borderless, isLoadingLoggedInUser, isDraft, collective }) => {
  const payeeLocation = expense?.payeeLocation || expense?.draft?.payeeLocation;
  const payee = isDraft ? expense?.draft?.payee : expense?.payee;
  const payeeStats = payee && !isDraft ? payee.stats : null; // stats not available for drafts
  const isInvoice = expense?.type === expenseTypes.INVOICE;
  const isCharge = expense?.type === expenseTypes.CHARGE;
  const isPaid = expense?.status === expenseStatus.PAID;
  const displayedHost = expense?.host ?? host;

  if (isLoading) {
    <LoadingPlaceholder height={150} mt={3} />;
  }

  if (!payee) {
    return null;
  }

  return (
    <Flex
      flexDirection={['column', 'row']}
      alignItems={['stretch', 'flex-start']}
      flexWrap={['nowrap', 'wrap', null, 'nowrap']}
    >
      <PrivateInfoColumn data-cy="expense-summary-payee" borderless={borderless}>
        <PrivateInfoColumnHeader>
          {isPaid ? (
            <FormattedMessage id="Expense.PaidTo" defaultMessage="Paid to" />
          ) : (
            <FormattedMessage id="Expense.PayTo" defaultMessage="Pay to" />
          )}
        </PrivateInfoColumnHeader>
        <LinkCollective collective={payee}>
          <Flex alignItems="center" fontSize="12px">
            {!payee.slug ? (
              <Avatar
                name={payee.organization?.name || payee.name}
                radius={24}
                backgroundColor="blue.100"
                color="blue.400"
              />
            ) : (
              <Avatar collective={payee} radius={24} />
            )}
            <Flex flexDirection="column" ml={2} mr={2} css={{ overflow: 'hidden' }}>
              <Span color="black.900" fontWeight="bold" truncateOverflow>
                {formatAccountName(
                  payee.organization?.name || payee.name,
                  payee.organization?.legalName || payee.legalName,
                )}
              </Span>
              {payee.type !== CollectiveType.VENDOR && (payee.organization?.slug || payee.slug) && (
                <Span color="black.900" fontSize="11px" truncateOverflow>
                  @{payee.organization?.slug || payee.slug}
                </Span>
              )}
            </Flex>
            {payeeStats && <PayeeTotalPayoutSumTooltip stats={payeeStats} />}
          </Flex>
        </LinkCollective>

        {payeeLocation && isInvoice && (
          <Container whiteSpace="pre-wrap" fontSize="11px" lineHeight="16px" mt={2}>
            <LocationAddress location={payeeLocation} isLoading={isLoadingLoggedInUser} />
          </Container>
        )}
        {payee.website && (
          <P mt={2} fontSize="11px">
            <StyledLink href={payee.website} openInNewTab>
              {payee.website}
            </StyledLink>
          </P>
        )}
      </PrivateInfoColumn>
      <PrivateInfoColumn mr={0} borderless={borderless}>
        <PrivateInfoColumnHeader>
          <FormattedMessage id="expense.payoutMethod" defaultMessage="payout method" />
        </PrivateInfoColumnHeader>
        <Container fontSize="12px" color="black.600">
          <Box mb={3} data-cy="expense-summary-payout-method-type">
            <PayoutMethodTypeWithIcon
              type={
                !expense.payoutMethod?.type && (expense.draft || expense.payee.isInvite)
                  ? expense.draft?.payoutMethod?.type || INVITE
                  : isCharge
                  ? VIRTUAL_CARD
                  : expense.payoutMethod?.type
              }
              name={expense?.virtualCard?.name && `${expense.virtualCard.name} Card (${expense.virtualCard.last4})`}
            />
          </Box>
          <div data-cy="expense-summary-payout-method-data">
            <PayoutMethodData
              payoutMethod={expense.draft?.payoutMethod ?? expense.payoutMethod}
              isLoading={isLoadingLoggedInUser}
            />
          </div>
          {expense.invoiceInfo && (
            <Box mt={3} data-cy="expense-summary-invoice-info">
              <Container fontSize="11px" fontWeight="500" mb={2}>
                <FormattedMessage id="ExpenseForm.InvoiceInfo" defaultMessage="Additional invoice information" />
                &nbsp;&nbsp;
                <PrivateInfoIcon color="#969BA3" />
              </Container>
              <P fontSize="11px" lineHeight="16px" whiteSpace="pre-wrap">
                {expense.invoiceInfo}
              </P>
            </Box>
          )}
        </Container>
      </PrivateInfoColumn>
      {displayedHost && (
        <PrivateInfoColumn data-cy="expense-summary-host" borderless={borderless}>
          <PrivateInfoColumnHeader>
            {isPaid ? (
              <FormattedMessage id="expense.PaidFromFiscalhost" defaultMessage="Paid from Fiscal Host" />
            ) : (
              <FormattedMessage id="expense.PayFromFiscalhost" defaultMessage="Pay from Fiscal Host" />
            )}
          </PrivateInfoColumnHeader>
          <LinkCollective collective={displayedHost}>
            <Flex alignItems="center">
              <Avatar collective={displayedHost} radius={24} />
              <Span ml={2} color="black.900" fontSize="12px" fontWeight="bold" truncateOverflow>
                {collective?.isActive ? (
                  formatAccountName(displayedHost.name, displayedHost.legalName)
                ) : (
                  <FormattedMessage
                    id="Fiscalhost.pending"
                    defaultMessage="{host} (pending)"
                    values={{
                      host: formatAccountName(displayedHost.name, displayedHost.legalName),
                    }}
                  />
                )}
              </Span>
            </Flex>
          </LinkCollective>
          {displayedHost.location && (
            <P whiteSpace="pre-wrap" fontSize="11px" mt={2}>
              {displayedHost.location.address}
            </P>
          )}
          {displayedHost.website && (
            <P mt={2} fontSize="11px">
              <StyledLink href={displayedHost.website} openInNewTab>
                {displayedHost.website}
              </StyledLink>
            </P>
          )}
        </PrivateInfoColumn>
      )}
    </Flex>
  );
};

PayeeTotalPayoutSumTooltip.propTypes = {
  stats: PropTypes.shape({
    totalPaidInvoices: PropTypes.shape({
      valueInCents: PropTypes.number,
      currency: PropTypes.string,
    }).isRequired,
    totalPaidReceipts: PropTypes.shape({
      valueInCents: PropTypes.number,
      currency: PropTypes.string,
    }).isRequired,
    totalPaidGrants: PropTypes.shape({
      valueInCents: PropTypes.number,
      currency: PropTypes.string,
    }).isRequired,
  }),
};

ExpensePayeeDetails.propTypes = {
  /** Set this to true if the expense is not loaded yet */
  isLoading: PropTypes.bool,
  /** Set this to true if this shoud use information from expense.draft property */
  isDraft: PropTypes.bool,
  /** Set this to true if the logged in user is currenltly loading */
  isLoadingLoggedInUser: PropTypes.bool,
  host: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    legalName: PropTypes.string,
    slug: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    website: PropTypes.string,
    location: PropTypes.shape({
      address: PropTypes.string,
      country: PropTypes.string,
    }),
  }),
  /** Must be provided if isLoading is false */
  expense: PropTypes.shape({
    id: PropTypes.string,
    legacyId: PropTypes.number,
    description: PropTypes.string,
    longDescription: PropTypes.string,
    currency: PropTypes.string,
    invoiceInfo: PropTypes.string,
    createdAt: PropTypes.string,
    status: PropTypes.oneOf(Object.values(expenseStatus)),
    type: PropTypes.oneOf(Object.values(expenseTypes)),
    tags: PropTypes.arrayOf(PropTypes.string),
    requiredLegalDocuments: PropTypes.arrayOf(PropTypes.string),
    draft: PropTypes.shape({
      payee: PropTypes.object,
      payeeLocation: PropTypes.object,
      payoutMethod: PropTypes.object,
    }),
    payee: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      name: PropTypes.string,
      slug: PropTypes.string,
      type: PropTypes.string,
      isAdmin: PropTypes.bool,
      isInvite: PropTypes.bool,
      stats: PropTypes.shape({
        totalPaidInvoices: PropTypes.shape({
          valueInCents: PropTypes.number,
          currency: PropTypes.string,
        }).isRequired,
        totalPaidReceipts: PropTypes.shape({
          valueInCents: PropTypes.number,
          currency: PropTypes.string,
        }).isRequired,
        totalPaidGrants: PropTypes.shape({
          valueInCents: PropTypes.number,
          currency: PropTypes.string,
        }).isRequired,
      }),
    }),
    payeeLocation: PropTypes.shape({
      address: PropTypes.string,
      country: PropTypes.string,
    }),
    createdByAccount: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      slug: PropTypes.string,
      type: PropTypes.string,
    }),
    host: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      legalName: PropTypes.string,
      slug: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      website: PropTypes.string,
      location: PropTypes.shape({
        address: PropTypes.string,
        country: PropTypes.string,
      }),
    }),
    payoutMethod: PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.oneOf(Object.values(PayoutMethodType)),
      data: PropTypes.object,
    }),
    virtualCard: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      last4: PropTypes.string,
    }),
  }),
  /** Disable border and paiding in styled card, usefull for modals */
  borderless: PropTypes.bool,
  collective: PropTypes.shape({
    id: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
  }),
};

export default ExpensePayeeDetails;
