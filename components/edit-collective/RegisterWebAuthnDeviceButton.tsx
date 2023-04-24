import React from 'react';
import { gql, useMutation } from '@apollo/client';
import * as webauthn from '@simplewebauthn/browser';

import { API_V2_CONTEXT } from '../../lib/graphql/helpers';
import { AccountReferenceInput } from '../../lib/graphql/types/v2/graphql';

import StyledButton from '../StyledButton';
import { TOAST_TYPE, useToasts } from '../ToastProvider';

const CreateWebAuthnRegistrationOptionsMutation = gql`
  mutation CreateWebAuthnRegistrationOptions($account: AccountReferenceInput!) {
    createWebAuthnRegistrationOptions(account: $account)
  }
`;

const addTwoFactorAuthToIndividualMutation = gql`
  mutation AddTwoFactorAuthToIndividual($account: AccountReferenceInput!, $token: String!) {
    addTwoFactorAuthTokenToIndividual(account: $account, token: $token, type: WEBAUTHN) {
      account {
        id
        hasTwoFactorAuth
        twoFactorMethods {
          id
          method
          createdAt
          description
          icon
        }
      }
      recoveryCodes
    }
  }
`;

export function RegisterWebAuthnDeviceButton({ account }: { account: AccountReferenceInput }) {
  const { addToast } = useToasts();
  const [createPublicKeyRequestOptions] = useMutation(CreateWebAuthnRegistrationOptionsMutation, {
    context: API_V2_CONTEXT,
  });

  const [addWebAuthn] = useMutation(addTwoFactorAuthToIndividualMutation, {
    context: API_V2_CONTEXT,
  });

  const register = React.useCallback(async () => {
    const response = await createPublicKeyRequestOptions({
      variables: {
        account,
      },
    });

    try {
      const registration = await webauthn.startRegistration(response.data.createWebAuthnRegistrationOptions);
      const registrationBase64 = Buffer.from(JSON.stringify(registration)).toString('base64');

      await addWebAuthn({
        variables: {
          account,
          token: registrationBase64,
        },
      });
    } catch (e) {
      addToast({ type: TOAST_TYPE.ERROR, message: e.message });
    }
  }, []);
  return <StyledButton onClick={register}>Register</StyledButton>;
}
