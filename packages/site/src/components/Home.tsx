import { useContext, useState } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import { connectSnap, isSnapInstalled, sendSafeTransaction } from '../utils';
import { ConnectButton, InstallFlaskButton, SendHelloButton } from './Buttons';
import { Card } from './Card';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error.muted};
  border: 1px solid ${({ theme }) => theme.colors.error.default};
  color: ${({ theme }) => theme.colors.error.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Input = styled.input`
  display: flex;
  align-self: flex-start;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: #ffffff;
  color: #24272a;
  border: 1px solid #ffffff;
  font-weight: bold;
  min-height: 4.2rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0;
  padding-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    width: 100%;
  }
`;

export const Home = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [txValue, setTxValue] = useState(0);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const snapInstalled = await isSnapInstalled();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: snapInstalled,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleSendHelloClick = async () => {
    const { ethereum } = window as any;
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    });

    const provider = new ethers.providers.Web3Provider(ethereum);
    const walletAddress = accounts[0]; // first account in MetaMask
    const signer = provider.getSigner(walletAddress);

    const abi = [
      {
        inputs: [
          {
            internalType: 'uint256',
            name: '_n2',
            type: 'uint256',
          },
        ],
        name: 'multiplyBy',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];

    const USDTContract = new ethers.Contract(
      '0xD4B081C226Bc8aBdaf111DEf54c09E779ad29428',
      abi,
    );

    const tx = await USDTContract.populateTransaction.multiplyBy(txValue);

    try {
      await sendSafeTransaction(signer, tx);
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  return (
    <Container>
      <Heading>
        Welcome to <Span>Decode Transaction</Span>
      </Heading>
      <Subtitle>Decoded Transactions using Metamask's snaps</Subtitle>
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!state.isFlask && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!state.isSnapInstalled && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!state.isFlask}
                />
              ),
            }}
            disabled={!state.isFlask}
          />
        )}
        <Card
          content={{
            title: 'Decode transaction example',
            description:
              'Before sending the transaction, the decoded transaction will be displayed in a popup.',
            button: (
              <SendHelloButton
                onClick={handleSendHelloClick}
                disabled={!state.isSnapInstalled}
              />
            ),
            input: (
              <Input
                type="number"
                value={txValue}
                onChange={(e) =>
                  setTxValue(parseInt(e.currentTarget.value, 10))
                }
              />
            ),
          }}
          disabled={!state.isSnapInstalled}
          fullWidth={state.isFlask && state.isSnapInstalled}
        />
        <Notice>
          <p>
            Please note that the <b>snap.manifest.json</b> and{' '}
            <b>package.json</b> must be located in the server root directory and
            the bundle must be hosted at the location specified by the location
            field.
          </p>
        </Notice>
      </CardContainer>
    </Container>
  );
};
