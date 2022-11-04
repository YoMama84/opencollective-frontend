import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { InfoCircle } from '@styled-icons/boxicons-regular/InfoCircle';
import { FastField, Field } from 'formik';
import { first, get, groupBy, isEmpty, omit, pick } from 'lodash';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { compareNames } from '../../lib/collective.lib';
import { AccountTypesWithHost, CollectiveType } from '../../lib/constants/collectives';
import expenseTypes from '../../lib/constants/expenseTypes';
import { PayoutMethodType } from '../../lib/constants/payout-method';
import { EMPTY_ARRAY } from '../../lib/constants/utils';
import { ERROR, isErrorType } from '../../lib/errors';
import { formatFormErrorMessage } from '../../lib/form-utils';
import { flattenObjectDeep } from '../../lib/utils';
import { checkRequiresAddress } from './lib/utils';

import CollectivePicker, {
  CUSTOM_OPTIONS_POSITION,
  FLAG_COLLECTIVE_PICKER_COLLECTIVE,
  FLAG_NEW_COLLECTIVE,
} from '../CollectivePicker';
import CollectivePickerAsync from '../CollectivePickerAsync';
import { Box, Flex } from '../Grid';
import MessageBox from '../MessageBox';
import StyledButton from '../StyledButton';
import StyledHr from '../StyledHr';
import StyledInput from '../StyledInput';
import StyledInputField from '../StyledInputField';
import StyledInputLocation from '../StyledInputLocation';
import StyledTextarea from '../StyledTextarea';
import StyledTooltip from '../StyledTooltip';
import { TwoFactorAuthRequiredMessage } from '../TwoFactorAuthRequiredMessage';

import PayoutMethodForm, { validatePayoutMethod } from './PayoutMethodForm';
import PayoutMethodSelect from './PayoutMethodSelect';

const { INDIVIDUAL, ORGANIZATION, COLLECTIVE, FUND, EVENT, PROJECT } = CollectiveType;

const msg = defineMessages({
  payeeLabel: {
    id: `ExpenseForm.payeeLabel`,
    defaultMessage: 'Who is being paid for this expense?',
  },
  payoutOptionLabel: {
    id: `ExpenseForm.PayoutOptionLabel`,
    defaultMessage: 'Payout method',
  },
  invoiceInfo: {
    id: 'ExpenseForm.InvoiceInfo',
    defaultMessage: 'Additional invoice information',
  },
  invoiceInfoPlaceholder: {
    id: 'ExpenseForm.InvoiceInfoPlaceholder',
    defaultMessage: 'Tax ID, VAT number, etc. This information will be printed on your invoice.',
  },
  country: {
    id: 'ExpenseForm.ChooseCountry',
    defaultMessage: 'Choose country',
  },
  address: {
    id: 'ExpenseForm.AddressLabel',
    defaultMessage: 'Physical address',
  },
});

const setLocationFromPayee = (formik, payee) => {
  formik.setFieldValue('payeeLocation.country', payee?.location?.country || null);
  formik.setFieldValue('payeeLocation.address', payee?.location?.address || '');
  formik.setFieldValue('payeeLocation.structured', payee?.location?.structured);
};

const getPayoutMethodsFromPayee = payee => {
  const payoutMethods = (get(payee, 'payoutMethods') || EMPTY_ARRAY).filter(({ isSaved }) => isSaved);

  // If the Payee is active (can manage a budget and has a balance). This is usually:
  // - a "Collective" family (Collective, Fund, Event, Project) with an host or Self Hosted
  // - an "Host" Organization with budget activated (new default)
  if (payee?.isActive) {
    if (!payoutMethods.find(pm => pm.type === PayoutMethodType.ACCOUNT_BALANCE)) {
      payoutMethods.push({
        id: 'new',
        data: {},
        type: PayoutMethodType.ACCOUNT_BALANCE,
        isSaved: true,
      });
    }
  }

  // If the Payee is in the "Collective" family (Collective, Fund, Event, Project)
  // But not the Host itself (Self Hosted)
  // Then we should add BANK_ACCOUNT and PAYPAL of the Host as an option
  if (payee && AccountTypesWithHost.includes(payee.type) && payee.id !== payee.host?.id) {
    const hostPayoutMethods = get(payee, 'host.payoutMethods') || EMPTY_ARRAY;
    let hostSuitablePayoutMethods = hostPayoutMethods
      .filter(payoutMethod => payoutMethod.type === PayoutMethodType.BANK_ACCOUNT)
      .filter(
        payoutMethod =>
          !payoutMethod.name ||
          payoutMethod.name.includes('Collectives account') ||
          payoutMethod.name.includes('Main account'),
      );
    if (hostSuitablePayoutMethods.length === 0) {
      hostSuitablePayoutMethods = hostPayoutMethods.filter(
        payoutMethod => payoutMethod.type === PayoutMethodType.PAYPAL,
      );
    }
    payoutMethods.push(...hostSuitablePayoutMethods.map(payoutMethod => ({ ...payoutMethod, isDeletable: false })));
  }

  return payoutMethods.length > 0 ? payoutMethods : EMPTY_ARRAY;
};

const refreshPayoutProfile = (formik, payoutProfiles) => {
  const payee = formik.values.payee
    ? payoutProfiles.find(profile => profile.id === formik.values.payee.id)
    : first(payoutProfiles);

  formik.setValues({ ...formik.values, draft: omit(formik.values.draft, ['payee']), payee });
};

const getPayeeOptions = (intl, payoutProfiles) => {
  const profileOptions = payoutProfiles.map(value => ({
    value,
    label: value.name,
    [FLAG_COLLECTIVE_PICKER_COLLECTIVE]: true,
  }));

  const profilesByType = groupBy(profileOptions, p => p.value.type);

  const myself = profilesByType[INDIVIDUAL] || [];
  const myOrganizations = profilesByType[ORGANIZATION] || [];

  myOrganizations.push({
    label: null,
    value: null,
    isDisabled: true,
    [FLAG_NEW_COLLECTIVE]: true,
    types: [CollectiveType.ORGANIZATION],
    __background__: 'white',
  });

  const payeeOptions = [
    { options: myself, label: intl.formatMessage({ defaultMessage: 'Myself' }) },
    { options: myOrganizations, label: intl.formatMessage({ id: 'organization', defaultMessage: 'My Organizations' }) },
  ];

  if (profilesByType[COLLECTIVE]?.length) {
    payeeOptions.push({
      options: profilesByType[COLLECTIVE],
      label: intl.formatMessage({ id: 'collective', defaultMessage: 'My Collectives' }),
    });
  }
  if (profilesByType[FUND]?.length) {
    payeeOptions.push({
      options: profilesByType[FUND],
      label: intl.formatMessage({ id: 'funds', defaultMessage: 'My Funds' }),
    });
  }
  if (profilesByType[PROJECT]?.length) {
    payeeOptions.push({
      options: profilesByType[PROJECT],
      label: intl.formatMessage({ defaultMessage: 'My Projects' }),
    });
  }
  if (profilesByType[EVENT]?.length) {
    payeeOptions.push({
      options: profilesByType[EVENT],
      label: intl.formatMessage({ id: 'events', defaultMessage: 'My Events' }),
    });
  }

  return payeeOptions;
};

const checkStepOneCompleted = (values, isOnBehalf, isMissing2FA) => {
  if (isMissing2FA) {
    return false;
  } else if (isOnBehalf) {
    return Boolean(values.payee);
  } else if (!isEmpty(flattenObjectDeep(validatePayoutMethod(values.payoutMethod)))) {
    return false; // There are some errors in the form
  } else if (checkRequiresAddress(values)) {
    // Require an address for non-receipt expenses
    return Boolean(values.payoutMethod && values.payeeLocation?.country && values.payeeLocation?.address);
  } else {
    return true;
  }
};

const ExpenseFormPayeeStep = ({
  formik,
  payoutProfiles,
  collective,
  onCancel,
  onNext,
  onInvite,
  onChange,
  isOnBehalf,
  loggedInAccount,
}) => {
  const intl = useIntl();
  const { formatMessage } = intl;
  const { values, errors } = formik;
  const isMissing2FA = Boolean(values.payee?.policies?.REQUIRE_2FA_FOR_ADMINS && !loggedInAccount?.hasTwoFactorAuth);
  const stepOneCompleted = checkStepOneCompleted(values, isOnBehalf, isMissing2FA);
  const allPayoutMethods = React.useMemo(
    () => getPayoutMethodsFromPayee(values.payee),
    [values.payee, loggedInAccount],
  );
  const onPayoutMethodRemove = React.useCallback(() => refreshPayoutProfile(formik, payoutProfiles), [payoutProfiles]);
  const setPayoutMethod = React.useCallback(({ value }) => formik.setFieldValue('payoutMethod', value), []);
  const payeeOptions = React.useMemo(() => getPayeeOptions(intl, payoutProfiles), [payoutProfiles]);
  const requiresAddress = checkRequiresAddress(values);
  const canInvite = !values?.status;

  const collectivePick = canInvite
    ? ({ id }) => (
        <CollectivePickerAsync
          inputId={id}
          data-cy="select-expense-payee"
          isSearchable
          collective={values.payee}
          onChange={({ value }) => {
            if (value) {
              const existingProfile = payoutProfiles.find(p => p.slug === value.slug);
              const isNewlyCreatedProfile = value.members?.some(
                m => m.role === 'ADMIN' && m.member.slug === loggedInAccount.slug,
              );

              const payee = existingProfile || {
                ...pick(value, ['id', 'name', 'slug', 'email', 'type']),
                isInvite: !isNewlyCreatedProfile,
              };

              if (isNewlyCreatedProfile) {
                payee.payoutMethods = [];
              }

              formik.setFieldValue('payee', payee);
              formik.setFieldValue('payoutMethod', null);
              setLocationFromPayee(formik, payee);
              onChange(payee);
            }
          }}
          styles={{
            menu: {
              borderRadius: '16px',
            },
            menuList: {
              padding: '8px',
            },
          }}
          emptyCustomOptions={payeeOptions}
          customOptionsPosition={CUSTOM_OPTIONS_POSITION.BOTTOM}
          getDefaultOptions={build => values.payee && build(values.payee)}
          invitable
          onInvite={onInvite}
          LoggedInUser={loggedInAccount}
          addLoggedInUserAsAdmin
          excludeAdminFields
        />
      )
    : ({ id }) => (
        <CollectivePicker
          inputId={id}
          customOptions={payeeOptions}
          getDefaultOptions={build => values.payee && build(values.payee)}
          data-cy="select-expense-payee"
          isSearchable
          collective={values.payee}
          onChange={({ value }) => {
            formik.setFieldValue('payee', value);
            formik.setFieldValue('payoutMethod', null);
            setLocationFromPayee(formik, value);
            onChange(value);
          }}
        />
      );

  return (
    <Fragment>
      <Flex flexDirection={['column', 'row']}>
        <Box mr={[null, 2, null, 4]} flexGrow="1" flexBasis="50%" maxWidth={[null, null, '60%']}>
          <Field name="payee">
            {({ field }) => (
              <StyledInputField
                name={field.name}
                label={formatMessage(msg.payeeLabel)}
                labelFontSize="13px"
                flex="1"
                mt={3}
              >
                {collectivePick}
              </StyledInputField>
            )}
          </Field>
          {!isMissing2FA && (
            <React.Fragment>
              {values.payee?.legalName && (
                <Field name="legalName">
                  {({ field }) => (
                    <StyledInputField
                      name={field.name}
                      label={
                        <React.Fragment>
                          <FormattedMessage id="LegalName" defaultMessage="Legal Name" />
                          &nbsp;
                          <StyledTooltip
                            content={() => (
                              <FormattedMessage
                                id="ExpenseForm.legalName.tooltip"
                                defaultMessage="The legal name of the payee. This can be changed in your profile settings."
                              />
                            )}
                          >
                            <InfoCircle size={16} />
                          </StyledTooltip>
                        </React.Fragment>
                      }
                      labelFontSize="13px"
                      flex="1"
                      mt={3}
                    >
                      <StyledInput value={values.payee.legalName} disabled />
                      {values.payoutMethod?.data?.accountHolderName &&
                        values.payee.legalName &&
                        !compareNames(values.payoutMethod.data.accountHolderName, values.payee.legalName) && (
                          <MessageBox mt={2} fontSize="12px" type="warning" withIcon>
                            <FormattedMessage
                              id="Warning.LegalNameNotMatchBankAccountName"
                              defaultMessage="The legal name should match the bank account holder name in most cases. Otherwise payments may be delayed. If the payment is to an organization, please select or create that organization's profile instead of your individual profile as the payee."
                            />
                          </MessageBox>
                        )}
                    </StyledInputField>
                  )}
                </Field>
              )}
              {requiresAddress && (
                <Box mt={3}>
                  <StyledInputLocation
                    onChange={values => {
                      formik.setFieldValue('payeeLocation', values);
                    }}
                    location={values.payeeLocation}
                    errors={errors.payeeLocation}
                  />
                </Box>
              )}
              {values.type === expenseTypes.INVOICE && (
                <FastField name="invoiceInfo">
                  {({ field }) => (
                    <StyledInputField
                      name={field.name}
                      label={formatMessage(msg.invoiceInfo)}
                      labelFontSize="13px"
                      required={false}
                      mt={3}
                    >
                      {inputProps => (
                        <Field
                          as={StyledTextarea}
                          {...inputProps}
                          {...field}
                          minHeight={80}
                          placeholder={formatMessage(msg.invoiceInfoPlaceholder)}
                        />
                      )}
                    </StyledInputField>
                  )}
                </FastField>
              )}
            </React.Fragment>
          )}
        </Box>
        {!isOnBehalf && (
          <Box flexGrow="1" flexBasis="50%" display={values.payee ? 'block' : 'none'}>
            <Field name="payoutMethod">
              {({ field }) => (
                <StyledInputField
                  name={field.name}
                  htmlFor="payout-method"
                  flex="1"
                  mt={3}
                  label={formatMessage(msg.payoutOptionLabel)}
                  labelFontSize="13px"
                  error={
                    isErrorType(errors.payoutMethod, ERROR.FORM_FIELD_REQUIRED)
                      ? formatFormErrorMessage(intl, errors.payoutMethod)
                      : null
                  }
                >
                  {({ id, error }) => (
                    <PayoutMethodSelect
                      inputId={id}
                      error={error}
                      onChange={setPayoutMethod}
                      onRemove={onPayoutMethodRemove}
                      payoutMethod={values.payoutMethod}
                      payoutMethods={allPayoutMethods}
                      payee={values.payee}
                      disabled={!values.payee || isMissing2FA}
                      collective={collective}
                    />
                  )}
                </StyledInputField>
              )}
            </Field>

            {values.payoutMethod && (
              <Field name="payoutMethod">
                {({ field, meta }) => (
                  <Box mt={3} flex="1">
                    <PayoutMethodForm
                      fieldsPrefix="payoutMethod"
                      payoutMethod={field.value}
                      host={collective.host}
                      errors={meta.error}
                    />
                  </Box>
                )}
              </Field>
            )}
          </Box>
        )}
      </Flex>

      {isMissing2FA && <TwoFactorAuthRequiredMessage mt={4} />}

      {values.payee && !isMissing2FA && (
        <Fragment>
          <StyledHr flex="1" mt={4} borderColor="black.300" />
          <Flex mt={3} flexWrap="wrap">
            {onCancel && (
              <StyledButton
                type="button"
                width={['100%', 'auto']}
                mx={[2, 0]}
                mr={[null, 3]}
                mt={2}
                whiteSpace="nowrap"
                data-cy="expense-cancel"
                onClick={() => {
                  onCancel?.();
                }}
              >
                <FormattedMessage id="actions.cancel" defaultMessage="Cancel" />
              </StyledButton>
            )}
            <StyledButton
              type="button"
              width={['100%', 'auto']}
              mx={[2, 0]}
              mr={[null, 3]}
              mt={2}
              whiteSpace="nowrap"
              data-cy="expense-next"
              buttonStyle="primary"
              disabled={!stepOneCompleted}
              onClick={async () => {
                const allErrors = await formik.validateForm();
                // Get the relevant errors for the payee step, ignores data.currency in the because it is related to expense amount.
                const errors = omit(pick(allErrors, ['payee', 'payoutMethod', 'payeeLocation']), [
                  'payoutMethod.data.currency',
                ]);
                if (isEmpty(flattenObjectDeep(errors))) {
                  onNext?.();
                } else {
                  // We use set touched here to display errors on fields that are not dirty.
                  // eslint-disable-next-line no-console
                  console.log('ExpenseFormPayeeStep > Validation failed', errors);
                  formik.setTouched(errors);
                  formik.setErrors(errors);
                }
              }}
            >
              <FormattedMessage id="Pagination.Next" defaultMessage="Next" />
              &nbsp;→
            </StyledButton>
          </Flex>
        </Fragment>
      )}
    </Fragment>
  );
};

ExpenseFormPayeeStep.propTypes = {
  formik: PropTypes.object,
  payoutProfiles: PropTypes.array,
  onCancel: PropTypes.func,
  onNext: PropTypes.func,
  onInvite: PropTypes.func,
  onChange: PropTypes.func,
  isOnBehalf: PropTypes.bool,
  loggedInAccount: PropTypes.object,
  collective: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    host: PropTypes.shape({
      transferwise: PropTypes.shape({
        availableCurrencies: PropTypes.arrayOf(PropTypes.object),
      }),
    }),
    settings: PropTypes.object,
  }).isRequired,
};

export default ExpenseFormPayeeStep;
