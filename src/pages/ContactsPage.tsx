import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, X, User, Users, MessageSquare, Loader2, FolderOpen, Download } from 'lucide-react'
import './ContactsPage.scss'

interface ContactInfo {
    username: string
    displayName: string
    remark?: string
    nickname?: string
    avatarUrl?: string
    type: 'friend' | 'group' | 'official' | 'other'
}

function ContactsPage() {
    const [contacts, setContacts] = useState<ContactInfo[]>([])
    const [filteredContacts, setFilteredContacts] = useState<ContactInfo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchKeyword, setSearchKeyword] = useState('')
    const [contactTypes, setContactTypes] = useState({
        friends: true,
        groups: true,
        officials: true
    })

    // 导出相关状态
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'vcf'>('json')
    const [exportAvatars, setExportAvatars] = useState(true)
    const [exportFolder, setExportFolder] = useState('')
    const [isExporting, setIsExporting] = useState(false)

    // 加载通讯录
    const loadContacts = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await window.electronAPI.chat.connect()
            if (!result.success) {
                console.error('连接失败:', result.error)
                setIsLoading(false)
                return
            }
            const contactsResult = await window.electronAPI.chat.getContacts()
            console.log('📞 getContacts结果:', contactsResult)
            if (contactsResult.success && contactsResult.contacts) {
                console.log('📊 总联系人数:', contactsResult.contacts.length)
                console.log('📊 按类型统计:', {
                    friends: contactsResult.contacts.filter(c => c.type === 'friend').length,
                    groups: contactsResult.contacts.filter(c => c.type === 'group').length,
                    officials: contactsResult.contacts.filter(c => c.type === 'official').length,
                    other: contactsResult.contacts.filter(c => c.type === 'other').length
                })

                // 获取头像URL
                const usernames = contactsResult.contacts.map(c => c.username)
                if (usernames.length > 0) {
                    const avatarResult = await window.electronAPI.chat.enrichSessionsContactInfo(usernames)
                    if (avatarResult.success && avatarResult.contacts) {
                        contactsResult.contacts.forEach(contact => {
                            const enriched = avatarResult.contacts?.[contact.username]
                            if (enriched?.avatarUrl) {
                                contact.avatarUrl = enriched.avatarUrl
                            }
                        })
                    }
                }

                setContacts(contactsResult.contacts)
                setFilteredContacts(contactsResult.contacts)
            }
        } catch (e) {
            console.error('加载通讯录失败:', e)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadContacts()
    }, [loadContacts])

    // 搜索和类型过滤
    useEffect(() => {
        let filtered = contacts

        // 类型过滤
        filtered = filtered.filter(c => {
            if (c.type === 'friend' && !contactTypes.friends) return false
            if (c.type === 'group' && !contactTypes.groups) return false
            if (c.type === 'official' && !contactTypes.officials) return false
            return true
        })

        // 关键词过滤
        if (searchKeyword.trim()) {
            const lower = searchKeyword.toLowerCase()
            filtered = filtered.filter(c =>
                c.displayName?.toLowerCase().includes(lower) ||
                c.remark?.toLowerCase().includes(lower) ||
                c.username.toLowerCase().includes(lower)
            )
        }

        setFilteredContacts(filtered)
    }, [searchKeyword, contacts, contactTypes])

    const getAvatarLetter = (name: string) => {
        if (!name) return '?'
        return [...name][0] || '?'
    }

    const getContactTypeIcon = (type: string) => {
        switch (type) {
            case 'friend': return <User size={14} />
            case 'group': return <Users size={14} />
            case 'official': return <MessageSquare size={14} />
            default: return <User size={14} />
        }
    }

    const getContactTypeName = (type: string) => {
        switch (type) {
            case 'friend': return '好友'
            case 'group': return '群聊'
            case 'official': return '公众号'
            default: return '其他'
        }
    }

    // 选择导出文件夹
    const selectExportFolder = async () => {
        try {
            const result = await window.electronAPI.dialog.openDirectory({
                title: '选择导出位置'
            })
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                setExportFolder(result.filePaths[0])
            }
        } catch (e) {
            console.error('选择文件夹失败:', e)
        }
    }

    // 开始导出
    const startExport = async () => {
        if (!exportFolder) {
            alert('请先选择导出位置')
            return
        }

        setIsExporting(true)
        try {
            const exportOptions = {
                format: exportFormat,
                exportAvatars,
                contactTypes: {
                    friends: contactTypes.friends,
                    groups: contactTypes.groups,
                    officials: contactTypes.officials
                }
            }

            const result = await window.electronAPI.export.exportContacts(exportFolder, exportOptions)

            if (result.success) {
                alert(`导出成功！共导出 ${result.successCount} 个联系人`)
            } else {
                alert(`导出失败：${result.error}`)
            }
        } catch (e) {
            console.error('导出失败:', e)
            alert(`导出失败：${String(e)}`)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="contacts-page">
            <div className="page-header">
                <h1>通讯录</h1>
                <button className="icon-btn" onClick={loadContacts} disabled={isLoading}>
                    <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
                </button>
            </div>

            <div className="contacts-filters">
                <div className="search-bar">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="搜索联系人..."
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                    />
                    {searchKeyword && (
                        <button className="clear-btn" onClick={() => setSearchKeyword('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="type-filters">
                    <label className="filter-checkbox">
                        <input
                            type="checkbox"
                            checked={contactTypes.friends}
                            onChange={e => setContactTypes(prev => ({ ...prev, friends: e.target.checked }))}
                        />
                        <div className="custom-checkbox"></div>
                        <User size={16} />
                        <span>好友</span>
                    </label>
                    <label className="filter-checkbox">
                        <input
                            type="checkbox"
                            checked={contactTypes.groups}
                            onChange={e => setContactTypes(prev => ({ ...prev, groups: e.target.checked }))}
                        />
                        <div className="custom-checkbox"></div>
                        <Users size={16} />
                        <span>群聊</span>
                    </label>
                    <label className="filter-checkbox">
                        <input
                            type="checkbox"
                            checked={contactTypes.officials}
                            onChange={e => setContactTypes(prev => ({ ...prev, officials: e.target.checked }))}
                        />
                        <div className="custom-checkbox"></div>
                        <MessageSquare size={16} />
                        <span>公众号</span>
                    </label>
                </div>

                <div className="contacts-count">
                    共 {filteredContacts.length} 个联系人
                </div>
            </div>

            {/* 导出区域 */}
            <div className="export-section">
                <h3>导出通讯录</h3>

                <div className="export-format">
                    <label>导出格式：</label>
                    <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'json' | 'csv' | 'vcf')}>
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                        <option value="vcf">VCF (vCard)</option>
                    </select>
                </div>

                <div className="export-options">
                    <label>
                        <input
                            type="checkbox"
                            checked={exportAvatars}
                            onChange={e => setExportAvatars(e.target.checked)}
                        />
                        <span>导出头像</span>
                    </label>
                </div>

                <div className="export-folder">
                    <button onClick={selectExportFolder} className="folder-btn">
                        <FolderOpen size={16} />
                        <span>{exportFolder || '选择导出位置'}</span>
                    </button>
                </div>

                <button
                    className="export-action-btn"
                    onClick={startExport}
                    disabled={!exportFolder || isExporting}
                >
                    <Download size={16} />
                    <span>{isExporting ? '导出中...' : '开始导出'}</span>
                </button>
            </div>

            <div className="contacts-content">
                {isLoading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="spin" />
                        <span>加载中...</span>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="empty-state">
                        <span>暂无联系人</span>
                    </div>
                ) : (
                    <div className="contacts-list">
                        {filteredContacts.map(contact => (
                            <div key={contact.username} className="contact-item">
                                <div className="contact-avatar">
                                    {contact.avatarUrl ? (
                                        <img src={contact.avatarUrl} alt="" />
                                    ) : (
                                        <span>{getAvatarLetter(contact.displayName)}</span>
                                    )}
                                </div>
                                <div className="contact-info">
                                    <div className="contact-name">{contact.displayName}</div>
                                    {contact.remark && contact.remark !== contact.displayName && (
                                        <div className="contact-remark">备注: {contact.remark}</div>
                                    )}
                                </div>
                                <div className={`contact-type ${contact.type}`}>
                                    {getContactTypeIcon(contact.type)}
                                    <span>{getContactTypeName(contact.type)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ContactsPage
