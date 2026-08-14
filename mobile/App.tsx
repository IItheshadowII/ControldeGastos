import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Updates from 'expo-updates'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import {
  deleteTransaction,
  getTransactions,
  getUsdRate,
  login,
  logout,
  restoreSession,
  renewFixedExpenses,
  scanTicketImage,
  saveTransaction,
  setPaid,
} from './src/api'
import { TicketScanResult, Transaction, TransactionDraft, TransactionType, User } from './src/types'

type Tab = 'home' | 'transactions'
type Filter = 'ALL' | 'PENDING' | 'PAID'

const colors = {
  bg: '#050607',
  surface: '#0c0e10',
  elevated: '#121519',
  border: '#20252b',
  text: '#f7f8fa',
  muted: '#858d98',
  green: '#00d89a',
  red: '#ff416c',
  blue: '#4a9dff',
  amber: '#ffb300',
  violet: '#9b6cff',
}

const emptyDraft = (type: TransactionType = 'EXPENSE'): TransactionDraft => ({
  description: '',
  amount: '',
  category: '',
  currency: 'ARS',
  type,
  frequency: 'VARIABLE',
  isPaid: type === 'INCOME',
  isSavings: false,
  incomeType: 'BLANCO',
  loanType: 'LENT',
  loanStatus: 'PENDING',
  loanParty: '',
})

const fromTransaction = (item: Transaction): TransactionDraft => ({
  description: item.description,
  amount: String(item.amount),
  category: item.category || '',
  currency: item.currency,
  type: item.type,
  frequency: item.frequency || 'VARIABLE',
  isPaid: item.isPaid,
  isSavings: !!item.isSavings,
  incomeType: item.incomeType || 'BLANCO',
  loanType: item.loanType || 'LENT',
  loanStatus: item.loanStatus || (item.isPaid ? 'PAID' : 'PENDING'),
  loanParty: item.loanParty || '',
})

const money = (value: number, currency: 'ARS' | 'USD' = 'ARS') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(value)

const isCurrentMonth = (date: string) => {
  const value = new Date(date)
  const now = new Date()
  return value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear()
}

const isNewerVersion = (latest: string, current: string) => {
  const normalize = (value: string) => value.replace(/^v/i, '').split('.').map((part) => Number(part) || 0)
  const next = normalize(latest)
  const installed = normalize(current)
  for (let index = 0; index < Math.max(next.length, installed.length); index += 1) {
    if ((next[index] || 0) !== (installed[index] || 0)) return (next[index] || 0) > (installed[index] || 0)
  }
  return false
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <FinanceApp />
    </SafeAreaProvider>
  )
}

function FinanceApp() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [usdRate, setUsdRate] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [draft, setDraft] = useState<TransactionDraft>(emptyDraft())
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .finally(() => setBooting(false))
  }, [])

  const loadTransactions = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      await renewFixedExpenses()
      const [nextTransactions, nextRate] = await Promise.all([
        getTransactions(),
        getUsdRate().catch(() => usdRate),
      ])
      setTransactions(nextTransactions)
      setUsdRate(nextRate)
    } catch (error) {
      const status = (error as Error & { status?: number }).status
      if (status === 401) {
        await logout()
        setUser(null)
      } else if (!quiet) {
        Alert.alert('Sin conexión', (error as Error).message)
      }
    } finally {
      setRefreshing(false)
    }
  }, [usdRate])

  useEffect(() => {
    if (user) loadTransactions(true)
  }, [user, loadTransactions])

  const openCreate = (type: TransactionType) => {
    setEditing(null)
    setDraft(emptyDraft(type))
    setEditorOpen(true)
  }

  const openEdit = (item: Transaction) => {
    setEditing(item)
    setDraft(fromTransaction(item))
    setEditorOpen(true)
  }

  if (booting) return <SplashScreen />
  if (!user) return <LoginScreen onLogin={setUser} />

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés salir de Finance AI?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout()
          setTransactions([])
          setUser(null)
        },
      },
    ])
  }

  const checkForUpdates = async () => {
    if (__DEV__) {
      Alert.alert('Actualizaciones', 'Las actualizaciones remotas se comprueban en la versión instalada.')
      return
    }

    setCheckingUpdate(true)
    try {
      try {
        const releaseResponse = await fetch('https://api.github.com/repos/IItheshadowII/ControldeGastos/releases/latest', {
          headers: { Accept: 'application/vnd.github+json' },
        })
        if (releaseResponse.ok) {
          const release = await releaseResponse.json()
          const latestVersion = String(release?.tag_name || '').replace(/^v/i, '')
          const installedVersion = Updates.runtimeVersion || '0.0.0'
          const apk = Array.isArray(release?.assets)
            ? release.assets.find((asset: { name?: string }) => asset?.name?.toLowerCase().endsWith('.apk'))
            : null
          if (apk?.browser_download_url && isNewerVersion(latestVersion, installedVersion)) {
            Alert.alert(
              `Nueva versión ${latestVersion}`,
              `Tenés instalada la ${installedVersion}. Esta actualización incorpora cambios de Android y requiere instalar un APK nuevo.`,
              [
                { text: 'Más tarde', style: 'cancel' },
                { text: 'Descargar APK', onPress: () => Linking.openURL(apk.browser_download_url) },
              ],
            )
            return
          }
        }
      } catch {
        // Si GitHub no responde, todavía podemos comprobar las actualizaciones OTA.
      }

      const update = await Updates.checkForUpdateAsync()
      if (!update.isAvailable) {
        Alert.alert('Finance AI está actualizada', 'Ya tenés la versión más reciente.')
        return
      }

      await Updates.fetchUpdateAsync()
      Alert.alert(
        'Actualización lista',
        'La nueva versión ya se descargó. ¿Querés aplicarla ahora?',
        [
          { text: 'Más tarde', style: 'cancel' },
          { text: 'Actualizar ahora', onPress: () => Updates.reloadAsync() },
        ],
      )
    } catch (error) {
      Alert.alert('No se pudo actualizar', (error as Error).message)
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleTicketScanned = (result: TicketScanResult) => {
    setScannerOpen(false)
    setEditing(null)
    setDraft({
      ...emptyDraft('EXPENSE'),
      description: result.description,
      amount: String(result.amount).replace('.', ','),
      category: result.category,
      currency: result.currency,
      isPaid: false,
    })
    setEditorOpen(true)
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <NativeStatusBar backgroundColor={colors.bg} barStyle="light-content" />
      <View style={styles.appShell}>
        <Header user={user} onLogout={handleLogout} onUpdate={checkForUpdates} checkingUpdate={checkingUpdate} />
        {tab === 'home' ? (
          <Dashboard
            transactions={transactions}
            usdRate={usdRate}
            refreshing={refreshing}
            onRefresh={() => loadTransactions()}
            onCreate={openCreate}
            onEdit={openEdit}
            onScanTicket={() => setScannerOpen(true)}
          />
        ) : (
          <TransactionsScreen
            transactions={transactions}
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
            refreshing={refreshing}
            onRefresh={() => loadTransactions()}
            onEdit={openEdit}
            onTogglePaid={async (item) => {
              try {
                await setPaid(item, !item.isPaid)
                await loadTransactions(true)
              } catch (error) {
                Alert.alert('No se pudo actualizar', (error as Error).message)
              }
            }}
          />
        )}

        <Pressable style={styles.fab} onPress={() => openCreate('EXPENSE')}>
          <Ionicons name="add" size={30} color="#001d14" />
        </Pressable>
        <BottomNav tab={tab} onChange={setTab} />
      </View>

      <TransactionEditor
        visible={editorOpen}
        editing={editing}
        draft={draft}
        setDraft={setDraft}
        onClose={() => setEditorOpen(false)}
        onSaved={async () => {
          setEditorOpen(false)
          await loadTransactions(true)
        }}
        onDeleted={async () => {
          if (!editing) return
          try {
            await deleteTransaction(editing.id)
            setEditorOpen(false)
            await loadTransactions(true)
          } catch (error) {
            Alert.alert('No se pudo eliminar', (error as Error).message)
          }
        }}
      />
      <TicketScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleTicketScanned}
      />
    </SafeAreaView>
  )
}

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.logoMark}><Text style={styles.logoLetter}>F</Text></View>
      <Text style={styles.splashTitle}>FINANCE AI</Text>
      <ActivityIndicator color={colors.green} style={{ marginTop: 28 }} />
    </View>
  )
}

function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Completá tu email y contraseña.')
      return
    }
    setLoading(true)
    setError('')
    try {
      onLogin(await login(email, password))
    } catch (loginError) {
      setError((loginError as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.loginSafe}>
      <KeyboardAvoidingView style={styles.loginFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.loginGlow} />
        <View style={styles.loginContent}>
          <View style={styles.loginBrand}>
            <View style={styles.logoMark}><Text style={styles.logoLetter}>F</Text></View>
            <Text style={styles.brandName}>FINANCE AI</Text>
          </View>
          <Text style={styles.loginTitle}>Tus finanzas,{`\n`}en un solo lugar.</Text>
          <Text style={styles.loginSubtitle}>Ingresá con la misma cuenta que usás en la web.</Text>
          <View style={styles.loginCard}>
            <FieldLabel text="EMAIL" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nombre@correo.com"
              placeholderTextColor="#525862"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
            />
            <FieldLabel text="CONTRASEÑA" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#525862"
              secureTextEntry
              style={styles.textInput}
              onSubmitEditing={submit}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#001d14" /> : <Text style={styles.primaryButtonText}>Ingresar</Text>}
            </Pressable>
          </View>
          <View style={styles.otaStatus}>
            <View style={styles.otaStatusDot} />
            <Text style={styles.otaStatusText}>ACTUALIZACIONES REMOTAS ACTIVAS</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Header({ user, onLogout, onUpdate, checkingUpdate }: {
  user: User
  onLogout: () => void
  onUpdate: () => void
  checkingUpdate: boolean
}) {
  const firstName = user.name?.split(' ')[0] || 'Ezequiel'
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>PANEL DE CONTROL</Text>
        <Text style={styles.headerTitle}>Hola, <Text style={{ color: colors.blue }}>{firstName}</Text></Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable style={styles.updateButton} onPress={onUpdate} disabled={checkingUpdate}>
          {checkingUpdate
            ? <ActivityIndicator size="small" color={colors.blue} />
            : <Ionicons name="cloud-download-outline" size={20} color={colors.blue} />}
        </Pressable>
        <Pressable style={styles.avatar} onPress={onLogout}>
          <Text style={styles.avatarText}>{firstName.slice(0, 2).toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  )
}

function Dashboard({ transactions, usdRate, refreshing, onRefresh, onCreate, onEdit, onScanTicket }: {
  transactions: Transaction[]
  usdRate: number
  refreshing: boolean
  onRefresh: () => void
  onCreate: (type: TransactionType) => void
  onEdit: (item: Transaction) => void
  onScanTicket: () => void
}) {
  const month = transactions.filter((item) => isCurrentMonth(item.date))
  const toArs = (item: Transaction) => item.currency === 'USD' ? item.amount * usdRate : item.amount
  const incomeItems = month.filter((item) => item.type === 'INCOME')
  const expenseItems = month.filter((item) => item.type === 'EXPENSE')
  const income = incomeItems.reduce((sum, item) => sum + toArs(item), 0)
  const expenses = expenseItems.reduce((sum, item) => sum + toArs(item), 0)
  const paidIncome = incomeItems.filter((item) => item.isPaid).reduce((sum, item) => sum + toArs(item), 0)
  const paidExpenses = expenseItems.filter((item) => item.isPaid).reduce((sum, item) => sum + toArs(item), 0)
  const pending = expenseItems.filter((item) => !item.isPaid)
  const balance = paidIncome - paidExpenses
  const savingRate = paidIncome > 0 ? Math.max(0, (balance / paidIncome) * 100) : 0

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.dashboardContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.rateStrip}>
        <Text style={styles.rateLabel}>DÓLAR OFICIAL · VENTA</Text>
        <Text style={styles.rateValue}>{money(usdRate)}</Text>
      </View>
      <LinearGradient colors={['#10251f', '#0b1110', '#0a0c0e']} style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.eyebrow}>BALANCE DEL MES</Text>
          <View style={styles.positivePill}><Text style={styles.positivePillText}>{balance >= 0 ? 'POSITIVO' : 'NEGATIVO'}</Text></View>
        </View>
        <Text style={[styles.balanceAmount, balance < 0 && { color: colors.red }]}>{money(balance)}</Text>
        <View style={styles.balanceFooter}>
          <Text style={styles.balanceCaption}>{month.length} movimientos</Text>
          <Text style={styles.balanceCaption}>{savingRate.toFixed(1)}% de ahorro</Text>
        </View>
      </LinearGradient>

      <View style={styles.metricGrid}>
        <MetricCard title="INGRESOS" value={money(income)} icon="trending-up" color={colors.green} />
        <MetricCard title="GASTOS" value={money(expenses)} icon="trending-down" color={colors.red} />
      </View>

      <Text style={styles.sectionTitle}>Acciones rápidas</Text>
      <View style={styles.quickRow}>
        <QuickAction label="Gasto" icon="remove" color={colors.red} onPress={() => onCreate('EXPENSE')} />
        <QuickAction label="Ingreso" icon="add" color={colors.green} onPress={() => onCreate('INCOME')} />
        <QuickAction label="Préstamo" icon="swap-horizontal" color={colors.violet} onPress={() => onCreate('LOAN')} />
      </View>
      <Pressable style={({ pressed }) => [styles.scanTicketAction, pressed && styles.pressed]} onPress={onScanTicket}>
        <View style={styles.scanTicketIcon}><Ionicons name="scan-outline" size={22} color={colors.blue} /></View>
        <View style={styles.scanTicketCopy}>
          <Text style={styles.scanTicketTitle}>Escanear ticket con IA</Text>
          <Text style={styles.scanTicketSubtitle}>La cámara completa el gasto por vos</Text>
        </View>
        <View style={styles.cameraBadge}><Ionicons name="camera-outline" size={14} color={colors.blue} /><Text style={styles.cameraBadgeText}>CÁMARA</Text></View>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pendientes</Text>
        <Text style={[styles.sectionTotal, { color: colors.amber }]}>{money(pending.reduce((sum, item) => sum + toArs(item), 0))}</Text>
      </View>
      <View style={styles.listCard}>
        {pending.length === 0 ? (
          <EmptyState icon="checkmark-circle-outline" text="No tenés gastos pendientes" />
        ) : pending.slice(0, 4).map((item, index) => (
          <TransactionRow key={item.id} item={item} onPress={() => onEdit(item)} last={index === Math.min(pending.length, 4) - 1} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Últimos movimientos</Text>
        <Text style={styles.sectionHint}>TOCÁ PARA EDITAR</Text>
      </View>
      <View style={styles.listCard}>
        {transactions.slice(0, 6).map((item, index) => (
          <TransactionRow key={item.id} item={item} onPress={() => onEdit(item)} last={index === Math.min(transactions.length, 6) - 1} />
        ))}
      </View>
      <View style={{ height: 110 }} />
    </ScrollView>
  )
}

function TransactionsScreen({ transactions, filter, setFilter, search, setSearch, refreshing, onRefresh, onEdit, onTogglePaid }: {
  transactions: Transaction[]
  filter: Filter
  setFilter: (filter: Filter) => void
  search: string
  setSearch: (value: string) => void
  refreshing: boolean
  onRefresh: () => void
  onEdit: (item: Transaction) => void
  onTogglePaid: (item: Transaction) => void
}) {
  const filtered = useMemo(() => transactions.filter((item) => {
    if (filter === 'PENDING' && item.isPaid) return false
    if (filter === 'PAID' && !item.isPaid) return false
    return item.description.toLowerCase().includes(search.trim().toLowerCase())
  }), [transactions, filter, search])

  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.transactionsContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Movimientos</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Buscar movimiento" placeholderTextColor="#59616b" style={styles.searchInput} />
      </View>
      <View style={styles.filterRow}>
        {(['ALL', 'PENDING', 'PAID'] as Filter[]).map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item === 'ALL' ? 'Todos' : item === 'PENDING' ? 'Pendientes' : 'Pagados'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.listCard}>
        {filtered.length === 0 ? <EmptyState icon="search-outline" text="No encontramos movimientos" /> : filtered.map((item, index) => (
          <View key={item.id} style={[styles.transactionWithAction, index < filtered.length - 1 && styles.rowBorder]}>
            <Pressable style={styles.transactionMain} onPress={() => onEdit(item)}>
              <TransactionIcon item={item} />
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionName} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.transactionMeta}>{new Date(item.date).toLocaleDateString('es-AR')} · {item.isSavings ? 'Ahorro' : item.frequency === 'FIXED' ? 'Fijo' : 'Variable'}</Text>
              </View>
              <View style={styles.transactionAmountWrap}>
                <Text style={[styles.transactionAmount, { color: item.isSavings ? colors.blue : item.type === 'INCOME' ? colors.green : colors.text }]}>
                  {item.isSavings ? '' : item.type === 'INCOME' ? '+' : '-'}{money(item.amount, item.currency)}
                </Text>
              </View>
            </Pressable>
            {item.type !== 'INCOME' && (
              <Pressable onPress={() => onTogglePaid(item)} style={[styles.statusButton, item.isPaid && styles.statusButtonPaid]}>
                <Ionicons name={item.isPaid ? 'checkmark' : 'time-outline'} size={15} color={item.isPaid ? colors.green : colors.amber} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      <View style={{ height: 110 }} />
    </ScrollView>
  )
}

function TicketScanner({ visible, onClose, onScanned }: {
  visible: boolean
  onClose: () => void
  onScanned: (result: TicketScanResult) => void
}) {
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [torch, setTorch] = useState(false)

  useEffect(() => {
    if (!visible) {
      setPhotoUri(null)
      setCapturing(false)
      setAnalyzing(false)
      setTorch(false)
    }
  }, [visible])

  const close = () => {
    if (analyzing) return
    setPhotoUri(null)
    onClose()
  }

  const capture = async () => {
    if (!cameraRef.current || capturing) return
    setCapturing(true)
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.82, skipProcessing: false })
      setPhotoUri(picture.uri)
    } catch (error) {
      Alert.alert('No se pudo tomar la foto', (error as Error).message)
    } finally {
      setCapturing(false)
    }
  }

  const analyze = async () => {
    if (!photoUri || analyzing) return
    setAnalyzing(true)
    try {
      onScanned(await scanTicketImage(photoUri))
    } catch (error) {
      Alert.alert(
        'No se pudo leer el ticket',
        `${(error as Error).message}\n\nPodés repetir la foto procurando buena luz y que se vea el total completo.`,
      )
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <SafeAreaView style={styles.scannerSafe} edges={['top', 'bottom']}>
        <View style={styles.scannerHeader}>
          <Pressable onPress={close} style={styles.scannerHeaderButton} disabled={analyzing}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.eyebrow}>LECTURA INTELIGENTE</Text>
            <Text style={styles.scannerTitle}>Escanear ticket</Text>
          </View>
          <Pressable onPress={() => setTorch((value) => !value)} style={styles.scannerHeaderButton} disabled={!!photoUri}>
            <Ionicons name={torch ? 'flash' : 'flash-off-outline'} size={21} color={torch ? colors.amber : colors.text} />
          </Pressable>
        </View>

        {!permission ? (
          <View style={styles.scannerMessage}><ActivityIndicator color={colors.blue} /></View>
        ) : !permission.granted ? (
          <View style={styles.scannerMessage}>
            <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={34} color={colors.blue} /></View>
            <Text style={styles.permissionTitle}>Necesitamos usar la cámara</Text>
            <Text style={styles.permissionText}>Finance AI solo usa la foto para reconocer los datos del ticket.</Text>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Permitir cámara</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.cameraStage}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.ticketPreview} resizeMode="contain" />
              ) : (
                <CameraView ref={cameraRef} style={styles.cameraView} facing="back" enableTorch={torch}>
                  <View style={styles.ticketGuide} pointerEvents="none">
                    <View style={[styles.guideCorner, styles.guideTopLeft]} />
                    <View style={[styles.guideCorner, styles.guideTopRight]} />
                    <View style={[styles.guideCorner, styles.guideBottomLeft]} />
                    <View style={[styles.guideCorner, styles.guideBottomRight]} />
                  </View>
                </CameraView>
              )}
            </View>

            <View style={styles.scannerInstructions}>
              <Text style={styles.scannerInstructionTitle}>{photoUri ? 'Revisá que el total sea legible' : 'Alineá el ticket dentro del marco'}</Text>
              <Text style={styles.scannerInstructionText}>{photoUri ? 'La IA completará concepto, monto, moneda y categoría.' : 'Usá buena luz y evitá reflejos o sombras.'}</Text>
            </View>

            <View style={styles.scannerControls}>
              {photoUri ? (
                <>
                  <Pressable style={styles.retakeButton} onPress={() => setPhotoUri(null)} disabled={analyzing}>
                    <Ionicons name="refresh" size={20} color={colors.text} />
                    <Text style={styles.retakeButtonText}>Repetir</Text>
                  </Pressable>
                  <Pressable style={styles.analyzeButton} onPress={analyze} disabled={analyzing}>
                    {analyzing ? <ActivityIndicator color="#001d14" /> : <Ionicons name="sparkles" size={20} color="#001d14" />}
                    <Text style={styles.analyzeButtonText}>{analyzing ? 'Analizando…' : 'Analizar con IA'}</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.shutterOuter} onPress={capture} disabled={capturing}>
                  <View style={styles.shutterInner}>{capturing && <ActivityIndicator color={colors.bg} />}</View>
                </Pressable>
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  )
}

function TransactionEditor({ visible, editing, draft, setDraft, onClose, onSaved, onDeleted }: {
  visible: boolean
  editing: Transaction | null
  draft: TransactionDraft
  setDraft: (draft: TransactionDraft) => void
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [saving, setSaving] = useState(false)
  const update = <K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) => setDraft({ ...draft, [key]: value })

  const submit = async () => {
    const amount = Number(draft.amount.replace(/\./g, '').replace(',', '.'))
    if (draft.description.trim().length < 3) return Alert.alert('Falta el concepto', 'Ingresá una descripción de al menos 3 caracteres.')
    if (!Number.isFinite(amount) || amount <= 0) return Alert.alert('Monto inválido', 'Ingresá un monto mayor a cero.')
    setSaving(true)
    try {
      await saveTransaction(draft, editing?.id)
      onSaved()
    } catch (error) {
      Alert.alert('No se pudo guardar', (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.eyebrow}>{editing ? 'EDITAR' : 'NUEVO'}</Text>
              <Text style={styles.modalTitle}>{draft.type === 'INCOME' ? 'Ingreso' : draft.type === 'LOAN' ? 'Préstamo' : 'Gasto'}</Text>
            </View>
            {editing ? (
              <Pressable onPress={() => Alert.alert('Eliminar movimiento', 'Esta acción no se puede deshacer.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: onDeleted },
              ])} style={styles.iconButton}><Ionicons name="trash-outline" size={20} color={colors.red} /></Pressable>
            ) : <View style={styles.iconButton} />}
          </View>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!editing && (
              <View style={styles.segmented}>
                <Segment label="Gasto" selected={draft.type === 'EXPENSE'} color={colors.red} onPress={() => setDraft(emptyDraft('EXPENSE'))} />
                <Segment label="Ingreso" selected={draft.type === 'INCOME'} color={colors.green} onPress={() => setDraft(emptyDraft('INCOME'))} />
                <Segment label="Préstamo" selected={draft.type === 'LOAN'} color={colors.violet} onPress={() => setDraft(emptyDraft('LOAN'))} />
              </View>
            )}

            <FieldLabel text="MONTO" />
            <View style={styles.amountField}>
              <Text style={styles.currencyPrefix}>{draft.currency === 'USD' ? 'U$D' : '$'}</Text>
              <TextInput
                value={draft.amount}
                onChangeText={(value) => update('amount', value.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#30363d"
                style={styles.amountInput}
              />
              <Pressable style={styles.currencyToggle} onPress={() => update('currency', draft.currency === 'ARS' ? 'USD' : 'ARS')}>
                <Text style={styles.currencyToggleText}>{draft.currency}</Text>
              </Pressable>
            </View>

            <FieldLabel text="CONCEPTO" />
            <TextInput value={draft.description} onChangeText={(value) => update('description', value)} placeholder="Ej: Supermercado, sueldo, alquiler…" placeholderTextColor="#525862" style={styles.textInput} />

            {draft.type === 'EXPENSE' && (
              <>
                <FieldLabel text="CATEGORÍA" />
                <TextInput value={draft.category} onChangeText={(value) => update('category', value)} placeholder="Ej: Alimentación, servicios, salud…" placeholderTextColor="#525862" style={styles.textInput} />
              </>
            )}

            {draft.type === 'INCOME' ? (
              <>
                <FieldLabel text="TIPO DE INGRESO" />
                <View style={styles.twoColumns}>
                  <Choice label="En blanco" selected={draft.incomeType === 'BLANCO'} onPress={() => update('incomeType', 'BLANCO')} />
                  <Choice label="En negro" selected={draft.incomeType === 'NEGRO'} onPress={() => update('incomeType', 'NEGRO')} />
                </View>
                <FieldLabel text="¿ES AHORRO?" />
                <Pressable
                  style={[styles.savingsToggle, draft.isSavings && styles.savingsToggleActive]}
                  onPress={() => update('isSavings', !draft.isSavings)}
                >
                  <View style={[styles.savingsCheck, draft.isSavings && styles.savingsCheckActive]}>
                    {draft.isSavings && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <View style={styles.savingsToggleCopy}>
                    <Text style={[styles.savingsToggleTitle, draft.isSavings && styles.savingsToggleTitleActive]}>
                      {draft.isSavings ? 'Sí, contar como ahorro' : 'No es ahorro'}
                    </Text>
                    <Text style={styles.savingsToggleHint}>Se mostrará separado de tus gastos habituales.</Text>
                  </View>
                  <Ionicons name="wallet-outline" size={21} color={draft.isSavings ? colors.blue : colors.muted} />
                </Pressable>
              </>
            ) : draft.type === 'LOAN' ? (
              <>
                <FieldLabel text="DIRECCIÓN" />
                <View style={styles.twoColumns}>
                  <Choice label="Presté dinero" selected={draft.loanType === 'LENT'} onPress={() => update('loanType', 'LENT')} />
                  <Choice label="Me prestaron" selected={draft.loanType === 'BORROWED'} onPress={() => update('loanType', 'BORROWED')} />
                </View>
                <FieldLabel text="PERSONA" />
                <TextInput value={draft.loanParty} onChangeText={(value) => update('loanParty', value)} placeholder="Nombre de la persona" placeholderTextColor="#525862" style={styles.textInput} />
                <FieldLabel text="ESTADO" />
                <View style={styles.twoColumns}>
                  <Choice label="Pendiente" selected={draft.loanStatus === 'PENDING'} onPress={() => update('loanStatus', 'PENDING')} />
                  <Choice label="Pagado" selected={draft.loanStatus === 'PAID'} onPress={() => update('loanStatus', 'PAID')} />
                </View>
              </>
            ) : (
              <>
                <FieldLabel text="CLASIFICACIÓN" />
                <View style={styles.twoColumns}>
                  <Choice label="Adicional" selected={draft.frequency === 'VARIABLE'} onPress={() => update('frequency', 'VARIABLE')} />
                  <Choice label="Fijo mensual" selected={draft.frequency === 'FIXED'} onPress={() => update('frequency', 'FIXED')} />
                </View>
                <FieldLabel text="ESTADO" />
                <View style={styles.twoColumns}>
                  <Choice label="Pendiente" selected={!draft.isPaid} onPress={() => update('isPaid', false)} />
                  <Choice label="Pagado" selected={draft.isPaid} onPress={() => update('isPaid', true)} />
                </View>
              </>
            )}

            <Pressable style={({ pressed }) => [styles.primaryButton, styles.saveButton, pressed && styles.pressed]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#001d14" /> : <Text style={styles.primaryButtonText}>{editing ? 'Guardar cambios' : 'Registrar movimiento'}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

function MetricCard({ title, value, icon, color }: { title: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={19} color={color} /></View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  )
}

function QuickAction({ label, icon, color, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}15` }]}><Ionicons name={icon} size={22} color={color} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  )
}

function TransactionIcon({ item }: { item: Transaction }) {
  const color = item.isSavings ? colors.blue : item.type === 'INCOME' ? colors.green : item.type === 'LOAN' ? colors.violet : colors.red
  const icon = item.isSavings ? 'wallet-outline' : item.type === 'INCOME' ? 'arrow-up' : item.type === 'LOAN' ? 'swap-horizontal' : 'arrow-down'
  return <View style={[styles.transactionIcon, { backgroundColor: `${color}13` }]}><Ionicons name={icon} size={17} color={color} /></View>
}

function TransactionRow({ item, onPress, last }: { item: Transaction; onPress: () => void; last: boolean }) {
  return (
    <Pressable style={[styles.transactionRow, !last && styles.rowBorder]} onPress={onPress}>
      <TransactionIcon item={item} />
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionName} numberOfLines={1}>{item.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.transactionMeta}>{new Date(item.date).toLocaleDateString('es-AR')}</Text>
          {item.isSavings
            ? <Text style={[styles.miniStatus, { color: colors.blue }]}>AHORRO</Text>
            : item.type !== 'INCOME' && <Text style={[styles.miniStatus, { color: item.isPaid ? colors.green : colors.amber }]}>{item.isPaid ? 'PAGADO' : 'PENDIENTE'}</Text>}
        </View>
      </View>
      <Text style={[styles.transactionAmount, { color: item.isSavings ? colors.blue : item.type === 'INCOME' ? colors.green : colors.text }]}>
        {item.isSavings ? '' : item.type === 'INCOME' ? '+' : '-'}{money(item.amount, item.currency)}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="#3d444d" />
    </Pressable>
  )
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.emptyState}><Ionicons name={icon} size={28} color="#444b55" /><Text style={styles.emptyText}>{text}</Text></View>
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>
}

function Segment({ label, selected, color, onPress }: { label: string; selected: boolean; color: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.segment, selected && { backgroundColor: `${color}18`, borderColor: `${color}55` }]}><Text style={[styles.segmentText, selected && { color }]}>{label}</Text></Pressable>
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  )
}

function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <SafeAreaView style={styles.navSafe} edges={['bottom']}>
      <View style={styles.bottomNav}>
        <NavItem label="Inicio" icon="grid-outline" selected={tab === 'home'} onPress={() => onChange('home')} />
        <View style={{ width: 64 }} />
        <NavItem label="Movimientos" icon="receipt-outline" selected={tab === 'transactions'} onPress={() => onChange('transactions')} />
      </View>
    </SafeAreaView>
  )
}

function NavItem({ label, icon, selected, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={selected ? colors.green : '#69717b'} />
      <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  appShell: { flex: 1, backgroundColor: colors.bg },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  splashTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 2, marginTop: 16 },
  logoMark: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5147f5', transform: [{ rotate: '3deg' }] },
  logoLetter: { color: '#fff', fontWeight: '900', fontStyle: 'italic', fontSize: 19 },
  loginSafe: { flex: 1, backgroundColor: colors.bg },
  loginFlex: { flex: 1 },
  loginGlow: { position: 'absolute', width: 330, height: 330, borderRadius: 200, backgroundColor: '#053627', opacity: 0.35, top: -160, right: -120 },
  loginContent: { flex: 1, justifyContent: 'center', padding: 24 },
  loginBrand: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 44 },
  brandName: { color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  loginTitle: { color: colors.text, fontSize: 38, lineHeight: 43, fontWeight: '800', letterSpacing: -1.5 },
  loginSubtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 14, marginBottom: 30 },
  loginCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20 },
  otaStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  otaStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  otaStatusText: { color: '#626b75', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  fieldLabel: { color: '#7b838d', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8, marginTop: 14 },
  textInput: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#090b0d', color: colors.text, paddingHorizontal: 16, fontSize: 15 },
  errorText: { color: colors.red, fontSize: 12, marginTop: 12 },
  primaryButton: { height: 56, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryButtonText: { color: '#001d14', fontWeight: '900', fontSize: 15 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  header: { height: 82, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#111418' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  updateButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1520', borderWidth: 1, borderColor: '#1c2b3e' },
  eyebrow: { color: '#707985', fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.7, marginTop: 3 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#e7e7e8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#15171a', fontSize: 15, fontWeight: '800' },
  content: { flex: 1 },
  dashboardContent: { padding: 18 },
  rateStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 },
  rateLabel: { color: '#6f7781', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  rateValue: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  balanceCard: { borderRadius: 24, borderWidth: 1, borderColor: '#1d332c', padding: 22, minHeight: 168 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  positivePill: { backgroundColor: '#00d89a15', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  positivePillText: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  balanceAmount: { color: colors.green, fontSize: 34, fontWeight: '800', letterSpacing: -1.6, marginTop: 21 },
  balanceFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 },
  balanceCaption: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  metricGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  metricCard: { flex: 1, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 17, minHeight: 135 },
  metricIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  metricTitle: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  metricValue: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 27, marginBottom: 13 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, height: 100, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: '#bdc2c8', fontSize: 11, fontWeight: '800', marginTop: 9 },
  scanTicketAction: { minHeight: 74, marginTop: 10, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0f15', borderRadius: 18, borderWidth: 1, borderColor: '#1a2b40' },
  scanTicketIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4a9dff15' },
  scanTicketCopy: { flex: 1, paddingHorizontal: 12 },
  scanTicketTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  scanTicketSubtitle: { color: colors.muted, fontSize: 9, marginTop: 4 },
  cameraBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: '#4a9dff12' },
  cameraBadgeText: { color: colors.blue, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTotal: { fontSize: 14, fontWeight: '800', marginTop: 15 },
  sectionHint: { color: colors.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 15 },
  listCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden' },
  transactionRow: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#181c20' },
  transactionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  transactionInfo: { flex: 1, minWidth: 0 },
  transactionName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  transactionMeta: { color: colors.muted, fontSize: 10, marginTop: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniStatus: { fontSize: 8, fontWeight: '900', marginTop: 5, letterSpacing: 0.5 },
  transactionAmount: { fontSize: 12, fontWeight: '800', maxWidth: 110 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, gap: 9 },
  emptyText: { color: colors.muted, fontSize: 12 },
  transactionsContent: { padding: 18 },
  screenTitle: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -1, marginTop: 6, marginBottom: 18 },
  searchBox: { height: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 15 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: '#00d89a16', borderColor: '#00d89a55' },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: colors.green },
  transactionWithAction: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11 },
  transactionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  transactionAmountWrap: { alignItems: 'flex-end', paddingLeft: 8 },
  statusButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffb30010', marginLeft: 8, borderWidth: 1, borderColor: '#ffb30028' },
  statusButtonPaid: { backgroundColor: '#00d89a10', borderColor: '#00d89a28' },
  fab: { position: 'absolute', bottom: 38, alignSelf: 'center', width: 62, height: 62, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', zIndex: 20, shadowColor: colors.green, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  navSafe: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#090b0df5', borderTopWidth: 1, borderTopColor: colors.border },
  bottomNav: { height: 72, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 22 },
  navItem: { width: 105, alignItems: 'center', justifyContent: 'center', gap: 4 },
  navLabel: { color: '#69717b', fontSize: 9, fontWeight: '800' },
  navLabelActive: { color: colors.green },
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  scannerSafe: { flex: 1, backgroundColor: '#030405' },
  scannerHeader: { height: 72, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scannerHeaderButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111419' },
  scannerTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 3 },
  scannerMessage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  permissionIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4a9dff15', marginBottom: 22 },
  permissionTitle: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  permissionText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  permissionButton: { height: 54, minWidth: 210, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, marginTop: 26 },
  permissionButtonText: { color: '#06111d', fontSize: 14, fontWeight: '900' },
  cameraStage: { flex: 1, marginHorizontal: 16, borderRadius: 26, overflow: 'hidden', backgroundColor: '#090b0e', borderWidth: 1, borderColor: '#242a31' },
  cameraView: { flex: 1 },
  ticketPreview: { width: '100%', height: '100%', backgroundColor: '#090b0e' },
  ticketGuide: { position: 'absolute', left: '11%', right: '11%', top: '9%', bottom: '9%' },
  guideCorner: { position: 'absolute', width: 42, height: 42, borderColor: colors.blue },
  guideTopLeft: { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 12 },
  guideTopRight: { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 12 },
  guideBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 12 },
  guideBottomRight: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 12 },
  scannerInstructions: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 18 },
  scannerInstructionTitle: { color: colors.text, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  scannerInstructionText: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  scannerControls: { minHeight: 112, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  retakeButton: { flex: 0.42, height: 56, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retakeButtonText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  analyzeButton: { flex: 0.58, height: 56, borderRadius: 16, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  analyzeButtonText: { color: '#001d14', fontSize: 13, fontWeight: '900' },
  modalHeader: { height: 70, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 2 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.surface },
  formContent: { padding: 20, paddingBottom: 50 },
  segmented: { flexDirection: 'row', gap: 7, padding: 5, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  segment: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  segmentText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  amountField: { minHeight: 86, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#090b0d', paddingHorizontal: 16 },
  currencyPrefix: { color: colors.muted, fontSize: 19, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, color: colors.text, fontSize: 35, fontWeight: '800', letterSpacing: -1 },
  currencyToggle: { backgroundColor: colors.elevated, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  currencyToggleText: { color: colors.blue, fontSize: 11, fontWeight: '900' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, minHeight: 52, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  choiceSelected: { backgroundColor: '#00d89a0c', borderColor: '#00d89a55' },
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  choiceTextSelected: { color: colors.text },
  savingsToggle: { minHeight: 76, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  savingsToggleActive: { borderColor: '#4a9dff55', backgroundColor: '#4a9dff10' },
  savingsCheck: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#424a54', alignItems: 'center', justifyContent: 'center' },
  savingsCheckActive: { borderColor: colors.blue, backgroundColor: colors.blue },
  savingsToggleCopy: { flex: 1 },
  savingsToggleTitle: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  savingsToggleTitleActive: { color: colors.blue },
  savingsToggleHint: { color: '#626b75', fontSize: 9, lineHeight: 13, marginTop: 4 },
  radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: '#505761', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.green },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  saveButton: { marginTop: 32 },
})
