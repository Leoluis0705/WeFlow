import { useState, useEffect, useRef } from 'react'
import * as configService from '../services/config'
import { ArrowRight, Fingerprint, Lock, ShieldCheck } from 'lucide-react'
import './LockScreen.scss'

interface LockScreenProps {
    onUnlock: () => void
    avatar?: string
}

async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
}

export default function LockScreen({ onUnlock, avatar }: LockScreenProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [showHello, setShowHello] = useState(false)
    const [helloAvailable, setHelloAvailable] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        checkHelloAvailability()
        // Auto focus input
        inputRef.current?.focus()
    }, [])

    const checkHelloAvailability = async () => {
        try {
            const useHello = await configService.getAuthUseHello()
            if (useHello && window.PublicKeyCredential) {
                // Simple check if WebAuthn is supported
                const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                setHelloAvailable(available)
                if (available) {
                    setShowHello(true)
                    verifyHello()
                }
            }
        } catch (e) {
            console.error('Failed to check Hello availability', e)
        }
    }

    const verifyHello = async () => {
        setIsVerifying(true)
        setError('')
        try {
            // Use WebAuthn for authentication
            // We use a dummy challenge because we are just verifying local presence
            const challenge = new Uint8Array(32)
            window.crypto.getRandomValues(challenge)

            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: window.location.hostname, // 'localhost' or empty for file://
                    userVerification: 'required',
                }
            })

            if (credential) {
                onUnlock()
            }
        } catch (e: any) {
            // NotAllowedError is common if user cancels
            if (e.name !== 'NotAllowedError') {
                console.error('Hello verification failed', e)
            }
        } finally {
            setIsVerifying(false)
        }
    }

    const handlePasswordSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!password) return

        setIsVerifying(true)
        setError('')

        try {
            const storedHash = await configService.getAuthPassword()
            const inputHash = await sha256(password)

            if (inputHash === storedHash) {
                onUnlock()
            } else {
                setError('密码错误')
                setPassword('')
            }
        } catch (e) {
            setError('验证失败')
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <div className="lock-screen">
            <div className="lock-content">
                <div className="lock-avatar">
                    {avatar ? (
                        <img src={avatar} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    ) : (
                        <Lock size={40} />
                    )}
                </div>

                <h2 className="lock-title">WeFlow 已锁定</h2>

                <form className="lock-form" onSubmit={handlePasswordSubmit}>
                    <div className="input-group">
                        <input
                            ref={inputRef}
                            type="password"
                            placeholder="输入应用密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isVerifying}
                        />
                        <button type="submit" className="submit-btn" disabled={!password || isVerifying}>
                            <ArrowRight size={18} />
                        </button>
                    </div>

                    {helloAvailable && (
                        <button
                            type="button"
                            className={`hello-btn ${isVerifying ? 'loading' : ''}`}
                            onClick={verifyHello}
                        >
                            <Fingerprint size={20} />
                            {isVerifying ? '验证中...' : '使用 Windows Hello 解锁'}
                        </button>
                    )}
                </form>

                {error && <div className="lock-error">{error}</div>}
            </div>
        </div>
    )
}
