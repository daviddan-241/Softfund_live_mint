import React, { useEffect, useState } from 'react';
import Head from 'next/head';

const USD_PRICE = 2.672;
const TREASURY_ADDRESS = "6v4DR5rkDFa3WdCQ35wvtfVYfk7i233Uiu6GmQ7JCdRu";

export default function Home() {
  const [provider, setProvider] = useState<any>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).solana && (window as any).solana.isPhantom) {
      setProvider((window as any).solana);
    }
    fetch('/api/price').then(r => r.json()).then(d => setSolPrice(d.sol_price)).catch(() => setSolPrice(null));
  }, []);

  async function connect() {
    if (!provider) return alert('Install Phantom wallet first');
    try {
      const resp = await provider.connect();
      setPublicKey(resp.publicKey.toString());
    } catch (err:any) {
      console.error(err);
      alert('Connection failed: ' + err?.message);
    }
  }

  async function mint() {
    if (!publicKey) return alert('Connect wallet first');
    if (!solPrice) return alert('SOL price not loaded');

    setLoading(true);
    try {
      const solAmount = USD_PRICE / solPrice;

      // 1) prepare unsigned tx + expectedLamports
      const prep = await fetch('/api/mint', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ buyer: publicKey, solAmount })
      });
      const prepJson = await prep.json();
      if (!prepJson.tx || !prepJson.expectedLamports) {
        alert('Failed to prepare tx: ' + JSON.stringify(prepJson));
        setLoading(false);
        return;
      }

      // 2) ask wallet to sign the transaction message returned (base64 of message)
      try {
        const messageBase64 = prepJson.tx;
        const signed = await provider.signTransaction(Buffer.from(messageBase64, 'base64'));
        const signedB64 = Buffer.from(signed.serialize()).toString('base64');

        // 3) submit signed tx to server
        const submitRes = await fetch('/api/submit', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ signedTx: signedB64, expectedLamports: prepJson.expectedLamports })
        });
        const submitJson = await submitRes.json();
        if (!submitJson.txid) {
          alert('Submission failed: ' + JSON.stringify(submitJson));
          setLoading(false);
          return;
        }

        // 4) verify on-chain
        const verifyRes = await fetch('/api/verify', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ txid: submitJson.txid, expectedLamports: prepJson.expectedLamports })
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.success) {
          setLastTx(submitJson.txid);
          alert('Payment confirmed! Tx: ' + submitJson.txid);
        } else {
          alert('Payment not verified: ' + JSON.stringify(verifyJson));
        }
      } catch (err:any) {
        console.error(err);
        alert('Signing or submission failed: ' + err?.message);
      }
    } catch (err:any) {
      console.error(err);
      alert('Mint flow failed: ' + err?.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth:800, margin:'40px auto', fontFamily:'Inter, system-ui'}}>
      <Head><title>softfund — Mint</title></Head>
      <h1>softfund — Mint</h1>
      <p>Price: ${USD_PRICE} USD</p>
      <p>Current SOL price: {solPrice ? `$${solPrice.toFixed(4)}` : 'loading...'}</p>
      <p>Treasury: {TREASURY_ADDRESS}</p>
      {publicKey ? (
        <div>
          <div>Connected: {publicKey}</div>
          <button onClick={mint} style={{marginTop:12,padding:'8px 14px'}} disabled={loading}>{loading ? 'Processing…' : 'Mint (Pay)'}</button>
        </div>
      ) : (
        <button onClick={connect} style={{padding:'8px 14px'}}>Connect Phantom</button>
      )}
      {lastTx && <p>Last confirmed Tx: <a href={`https://explorer.solana.com/tx/${lastTx}`} target="_blank" rel="noreferrer">{lastTx}</a></p>}
      <hr style={{marginTop:30}} />
      <small>Note: This project is configured for Solana Mainnet and will send real SOL payments to the treasury address shown above.</small>
    </div>
  );
}
