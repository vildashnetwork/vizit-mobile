import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    Platform
} from "react-native";
import Entypo from '@expo/vector-icons/Entypo';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LineChart, PieChart } from "react-native-chart-kit";
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const API = "https://auth.vizit.homes/api";

// Types
type Transaction = {
    _id: string;
    nkwaTransactionId: string;
    amount: number;
    currency: string;
    status: string;
    paymentType: string;
    description: string;
    createdAt: string;
    phoneNumber?: string;
    fee?: number;
    internalRef?: string;
};

type UserData = {
    _id: string;
    name: string;
    email: string;
    profile: string;
    role: string;
    totalBalance: number;
    accountstatus: string;
    status: string;
    verified: boolean;
    phone?: string;
    location?: string;
    companyName?: string;
    paymentprscribtion?: Transaction[];
    createdAt: string;
};

export default function StatsDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year, all
    const [stats, setStats] = useState({
        totalEarnings: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        averageTransaction: 0,
        highestTransaction: 0,
        lowestTransaction: 0,
        totalFees: 0,
    });

    // Fetch user data from AsyncStorage or decode token
    const fetchUserData = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                router.push("/Login");
                return null;
            }

            const res = await axios.get(`${API}/owner/decode/token/owner`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const userData = res.data.res || res.data;
            setUser(userData);

            // Set transactions from user data
            if (userData.paymentprscribtion && userData.paymentprscribtion.length > 0) {
                setTransactions(userData.paymentprscribtion);
            }

            return userData;
        } catch (error) {
            console.error("Failed to fetch user data:", error);
            return null;
        }
    }, []);

    // Calculate statistics
    const calculateStats = useCallback(() => {
        if (!transactions.length) return;

        const successful = transactions.filter(t => t.status === 'success');
        const pending = transactions.filter(t => t.status === 'pending' || t.status === 'processing');
        const failed = transactions.filter(t => t.status === 'failed' || t.status === 'cancelled');

        const totalEarnings = successful.reduce((sum, t) => sum + t.amount, 0);
        const totalFees = successful.reduce((sum, t) => sum + (t.fee || 0), 0);

        const amounts = successful.map(t => t.amount);
        const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
        const lowest = amounts.length > 0 ? Math.min(...amounts) : 0;
        const average = successful.length > 0 ? totalEarnings / successful.length : 0;

        setStats({
            totalEarnings,
            totalTransactions: transactions.length,
            successfulTransactions: successful.length,
            pendingTransactions: pending.length,
            failedTransactions: failed.length,
            averageTransaction: average,
            highestTransaction: highest,
            lowestTransaction: lowest,
            totalFees,
        });
    }, [transactions]);

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        await fetchUserData();
        setLoading(false);
    }, [fetchUserData]);

    // Refresh data
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Initial load
    useEffect(() => {
        loadData();
    }, []);

    // Calculate stats when data changes
    useEffect(() => {
        calculateStats();
    }, [transactions]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount).replace('XAF', 'FCFA');
    };

    // Format compact currency (for charts)
    const formatCompactCurrency = (amount: number) => {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M`;
        }
        if (amount >= 1000) {
            return `${(amount / 1000).toFixed(1)}K`;
        }
        return amount.toString();
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Format time
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get chart data based on selected period
    const getChartData = () => {
        const now = new Date();
        let labels: string[] = [];
        let data: number[] = [];

        if (selectedPeriod === 'week') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));

                const dayTransactions = transactions.filter(t => {
                    const tDate = new Date(t.createdAt);
                    return tDate.toDateString() === date.toDateString() && t.status === 'success';
                });
                data.push(dayTransactions.reduce((sum, t) => sum + t.amount, 0));
            }
        } else if (selectedPeriod === 'month') {
            // Last 30 days (grouped by week)
            const weeks = [];
            for (let i = 0; i < 4; i++) {
                const endDate = new Date(now);
                endDate.setDate(now.getDate() - (i * 7));
                const startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 7);

                labels.unshift(`W${4 - i}`);

                const weekTransactions = transactions.filter(t => {
                    const tDate = new Date(t.createdAt);
                    return tDate >= startDate && tDate < endDate && t.status === 'success';
                });
                data.unshift(weekTransactions.reduce((sum, t) => sum + t.amount, 0));
            }
        } else if (selectedPeriod === 'year') {
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now);
                date.setMonth(date.getMonth() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short' }));

                const monthTransactions = transactions.filter(t => {
                    const tDate = new Date(t.createdAt);
                    return tDate.getMonth() === date.getMonth() &&
                        tDate.getFullYear() === date.getFullYear() &&
                        t.status === 'success';
                });
                data.push(monthTransactions.reduce((sum, t) => sum + t.amount, 0));
            }
        } else {
            // All time - show last 6 periods based on data range
            const dates = transactions.map(t => new Date(t.createdAt));
            if (dates.length === 0) return { labels: [], data: [] };

            const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
            const monthDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
                (maxDate.getMonth() - minDate.getMonth());

            if (monthDiff <= 3) {
                // Show by week
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - (i * 7));
                    labels.push(`W${6 - i}`);

                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - 7);

                    const weekTransactions = transactions.filter(t => {
                        const tDate = new Date(t.createdAt);
                        return tDate >= weekStart && tDate < date && t.status === 'success';
                    });
                    data.push(weekTransactions.reduce((sum, t) => sum + t.amount, 0));
                }
            } else {
                // Show by month
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(now);
                    date.setMonth(date.getMonth() - i);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));

                    const monthTransactions = transactions.filter(t => {
                        const tDate = new Date(t.createdAt);
                        return tDate.getMonth() === date.getMonth() &&
                            tDate.getFullYear() === date.getFullYear() &&
                            t.status === 'success';
                    });
                    data.push(monthTransactions.reduce((sum, t) => sum + t.amount, 0));
                }
            }
        }

        return { labels, data };
    };

    // Pie chart data for transaction status
    const pieData = [
        {
            name: 'Successful',
            population: stats.successfulTransactions,
            color: '#10ca8c',
            legendFontColor: '#333',
            legendFontSize: 12,
        },
        {
            name: 'Pending',
            population: stats.pendingTransactions,
            color: '#f59e0b',
            legendFontColor: '#333',
            legendFontSize: 12,
        },
        {
            name: 'Failed',
            population: stats.failedTransactions,
            color: '#ef4444',
            legendFontColor: '#333',
            legendFontSize: 12,
        },
    ].filter(item => item.population > 0);

    const chartConfig = {
        backgroundColor: '#ffffff',
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(16, 202, 140, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#10ca8c',
        },
        formatYLabel: (value: string) => formatCompactCurrency(parseInt(value)),
    };

    const chartData = getChartData();

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
                <ActivityIndicator size="large" color="#10ca8c" />
                <Text style={styles.loadingText}>Loading your stats...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#10ca8c" />

            {/* Header */}
            <LinearGradient
                colors={['#10ca8c', '#0d9b6e']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Entypo name="home" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Transaction Stats</Text>
                    <TouchableOpacity style={styles.notificationButton} onPress={onRefresh}>
                        <Ionicons name="refresh" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* User Info */}
                <View style={styles.userInfoContainer}>
                    <Image
                        source={{ uri: user?.profile || 'https://via.placeholder.com/60' }}
                        style={styles.userAvatar}
                    />
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{user?.name || 'User'}</Text>
                        <Text style={styles.userEmail}>{user?.email || ''}</Text>
                        <View style={styles.verifiedBadge}>
                            <Ionicons
                                name={user?.verified ? "checkmark-circle" : "time"}
                                size={14}
                                color="#fff"
                            />
                            <Text style={styles.verifiedText}>
                                {user?.verified ? 'Verified' : 'Pending Verification'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(user?.totalBalance || 0)}</Text>
                    <View style={styles.balanceFooter}>
                        <View style={styles.balanceItem}>
                            <Ionicons name="arrow-up" size={14} color="#10ca8c" />
                            <Text style={styles.balanceItemText}>
                                +{formatCurrency(stats.totalEarnings)} total earned
                            </Text>
                        </View>
                        <View style={styles.balanceItem}>
                            <Ionicons name="calendar" size={14} color="#fff" />
                            <Text style={styles.balanceItemText}>
                                {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2026'}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10ca8c']} />
                }
            >
                {/* Stats Cards */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#e6f7f0' }]}>
                            <MaterialCommunityIcons name="cash" size={24} color="#10ca8c" />
                        </View>
                        <Text style={styles.statValue}>{formatCurrency(stats.totalEarnings)}</Text>
                        <Text style={styles.statLabel}>Total Earnings</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#e6f0ff' }]}>
                            <Ionicons name="swap-horizontal" size={24} color="#3b82f6" />
                        </View>
                        <Text style={styles.statValue}>{stats.totalTransactions}</Text>
                        <Text style={styles.statLabel}>Transactions</Text>
                        <Text style={styles.statSubtext}>
                            {stats.successfulTransactions} successful
                        </Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#fff2e6' }]}>
                            <Ionicons name="trending-up" size={24} color="#f59e0b" />
                        </View>
                        <Text style={styles.statValue}>{formatCurrency(stats.averageTransaction)}</Text>
                        <Text style={styles.statLabel}>Avg. Amount</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#ffe6f0' }]}>
                            <Ionicons name="stats-chart" size={24} color="#ec4899" />
                        </View>
                        <Text style={styles.statValue}>{formatCurrency(stats.highestTransaction)}</Text>
                        <Text style={styles.statLabel}>Highest</Text>
                    </View>
                </View>

                {/* Earnings Chart */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Earnings Overview</Text>
                        <View style={styles.periodSelector}>
                            {['week', 'month', 'year', 'all'].map((period) => (
                                <TouchableOpacity
                                    key={period}
                                    style={[
                                        styles.periodButton,
                                        selectedPeriod === period && styles.activePeriodButton
                                    ]}
                                    onPress={() => setSelectedPeriod(period)}
                                >
                                    <Text style={[
                                        styles.periodText,
                                        selectedPeriod === period && styles.activePeriodText
                                    ]}>
                                        {period === 'all' ? 'All' : period.charAt(0).toUpperCase() + period.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {chartData.data.some(v => v > 0) ? (
                        <LineChart
                            data={{
                                labels: chartData.labels,
                                datasets: [{
                                    data: chartData.data,
                                }],
                            }}
                            width={width - 40}
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                            withInnerLines={false}
                            withOuterLines={true}
                            withVerticalLines={false}
                            withHorizontalLines={true}
                            withVerticalLabels={true}
                            withHorizontalLabels={true}
                            fromZero={true}
                            segments={4}
                        />
                    ) : (
                        <View style={styles.noDataContainer}>
                            <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
                            <Text style={styles.noDataText}>No earnings data for this period</Text>
                        </View>
                    )}
                </View>

                {/* Transaction Distribution and Quick Stats */}
                <View style={styles.rowCard}>
                    <View style={styles.halfCard}>
                        <Text style={styles.cardTitle}>Transaction Status</Text>
                        {pieData.length > 0 ? (
                            <PieChart
                                data={pieData}
                                width={width / 2 - 24}
                                height={150}
                                chartConfig={chartConfig}
                                accessor="population"
                                backgroundColor="transparent"
                                paddingLeft="10"
                                absolute
                                hasLegend={false}
                            />
                        ) : (
                            <View style={styles.smallNoData}>
                                <Text style={styles.smallNoDataText}>No transactions</Text>
                            </View>
                        )}

                        {/* Legend */}
                        <View style={styles.legendContainer}>
                            {pieData.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText}>{item.name}</Text>
                                    <Text style={styles.legendValue}>{item.population}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.halfCard}>
                        <Text style={styles.cardTitle}>Quick Stats</Text>
                        <View style={styles.quickStatsList}>
                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatLabel}>Success Rate</Text>
                                <Text style={styles.quickStatValue}>
                                    {stats.totalTransactions > 0
                                        ? Math.round((stats.successfulTransactions / stats.totalTransactions) * 100)
                                        : 0}%
                                </Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, {
                                    width: `${stats.totalTransactions > 0
                                        ? (stats.successfulTransactions / stats.totalTransactions) * 100
                                        : 0}%`,
                                    backgroundColor: '#10ca8c'
                                }]} />
                            </View>

                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatLabel}>Pending</Text>
                                <Text style={styles.quickStatValue}>
                                    {stats.pendingTransactions}
                                </Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, {
                                    width: `${stats.totalTransactions > 0
                                        ? (stats.pendingTransactions / stats.totalTransactions) * 100
                                        : 0}%`,
                                    backgroundColor: '#f59e0b'
                                }]} />
                            </View>

                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatLabel}>Failed</Text>
                                <Text style={styles.quickStatValue}>
                                    {stats.failedTransactions}
                                </Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, {
                                    width: `${stats.totalTransactions > 0
                                        ? (stats.failedTransactions / stats.totalTransactions) * 100
                                        : 0}%`,
                                    backgroundColor: '#ef4444'
                                }]} />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatLabel}>Total Fees</Text>
                                <Text style={styles.quickStatValue}>
                                    {formatCurrency(stats.totalFees)}
                                </Text>
                            </View>

                            <View style={styles.quickStatItem}>
                                <Text style={styles.quickStatLabel}>Lowest Amount</Text>
                                <Text style={styles.quickStatValue}>
                                    {formatCurrency(stats.lowestTransaction)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Recent Transactions */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        {transactions.length > 5 && (
                            <TouchableOpacity onPress={() => router.push('/transactions')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {transactions.length > 0 ? (
                        transactions.slice(0, 5).map((transaction, index) => (
                            <View key={transaction._id || index} style={styles.transactionItem}>
                                <View style={styles.transactionLeft}>
                                    <View style={[
                                        styles.transactionIcon,
                                        {
                                            backgroundColor: transaction.status === 'success'
                                                ? '#e6f7f0'
                                                : transaction.status === 'pending' || transaction.status === 'processing'
                                                    ? '#fff2e6'
                                                    : '#ffe6e6'
                                        }
                                    ]}>
                                        <Ionicons
                                            name={transaction.status === 'success'
                                                ? "checkmark"
                                                : transaction.status === 'pending' || transaction.status === 'processing'
                                                    ? "time"
                                                    : "close"
                                            }
                                            size={20}
                                            color={transaction.status === 'success'
                                                ? "#10ca8c"
                                                : transaction.status === 'pending' || transaction.status === 'processing'
                                                    ? "#f59e0b"
                                                    : "#ef4444"
                                            }
                                        />
                                    </View>
                                    <View style={styles.transactionDetails}>
                                        <Text style={styles.transactionTitle}>
                                            {transaction.description || 'Payment'}
                                        </Text>
                                        <Text style={styles.transactionDate}>
                                            {formatDate(transaction.createdAt)} · {formatTime(transaction.createdAt)}
                                        </Text>
                                        {transaction.internalRef && (
                                            <Text style={styles.transactionRef}>
                                                Ref: {transaction.internalRef}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.transactionRight}>
                                    <Text style={[
                                        styles.transactionAmount,
                                        transaction.status === 'success' && styles.successAmount
                                    ]}>
                                        {formatCurrency(transaction.amount)}
                                    </Text>
                                    <View style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: transaction.status === 'success'
                                                ? '#e6f7f0'
                                                : transaction.status === 'pending' || transaction.status === 'processing'
                                                    ? '#fff2e6'
                                                    : '#ffe6e6'
                                        }
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            {
                                                color: transaction.status === 'success'
                                                    ? '#10ca8c'
                                                    : transaction.status === 'pending' || transaction.status === 'processing'
                                                        ? '#f59e0b'
                                                        : '#ef4444'
                                            }
                                        ]}>
                                            {transaction.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cash-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                            <Text style={styles.emptyText}>
                                Your transactions will appear here once you start receiving payments
                            </Text>
                        </View>
                    )}
                </View>

                {/* Summary Footer */}
                {transactions.length > 0 && (
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Successful</Text>
                                <Text style={styles.summaryValue}>{stats.successfulTransactions}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Pending</Text>
                                <Text style={styles.summaryValue}>{stats.pendingTransactions}</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Failed</Text>
                                <Text style={styles.summaryValue}>{stats.failedTransactions}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Bottom Padding */}
                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    userAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#fff',
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    verifiedText: {
        fontSize: 11,
        color: '#fff',
        marginLeft: 4,
    },
    balanceCard: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 16,
        padding: 16,
    },
    balanceLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 12,
    },
    balanceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    balanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceItemText: {
        fontSize: 11,
        color: '#fff',
        marginLeft: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        marginTop: -10,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        width: (width - 48) / 2,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#333',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    statSubtext: {
        fontSize: 10,
        color: '#999',
    },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        padding: 2,
    },
    periodButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 18,
        minWidth: 45,
        alignItems: 'center',
    },
    activePeriodButton: {
        backgroundColor: '#10ca8c',
    },
    periodText: {
        fontSize: 11,
        color: '#666',
    },
    activePeriodText: {
        color: '#fff',
        fontWeight: '600',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
        alignSelf: 'center',
    },
    noDataContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        marginTop: 12,
        fontSize: 14,
        color: '#999',
    },
    rowCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    halfCard: {
        width: (width - 48) / 2,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
    },
    smallNoData: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    smallNoDataText: {
        fontSize: 12,
        color: '#999',
    },
    legendContainer: {
        marginTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    legendText: {
        fontSize: 11,
        color: '#666',
        flex: 1,
    },
    legendValue: {
        fontSize: 11,
        fontWeight: '600',
        color: '#333',
    },
    quickStatsList: {
        marginTop: 4,
    },
    quickStatItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    quickStatLabel: {
        fontSize: 12,
        color: '#666',
    },
    quickStatValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333',
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#f0f0f0',
        borderRadius: 2,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 10,
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    viewAllText: {
        fontSize: 12,
        color: '#10ca8c',
        fontWeight: '600',
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    transactionDate: {
        fontSize: 10,
        color: '#999',
    },
    transactionRef: {
        fontSize: 9,
        color: '#ccc',
        marginTop: 2,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    successAmount: {
        color: '#10ca8c',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    emptyContainer: {
        paddingVertical: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 18,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
});