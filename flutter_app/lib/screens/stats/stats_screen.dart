import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/task_provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/constants.dart';
import '../../utils/helpers.dart';
import '../../widgets/loading_overlay.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/chart_card.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({Key? key}) : super(key: key);

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  Map<String, dynamic> _stats = {};
  String _selectedPeriod = 'week';
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadStats();
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
  
  Future<void> _loadStats() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      final stats = await taskProvider.getTaskStats(_selectedPeriod);
      
      if (mounted) {
        setState(() {
          _stats = stats;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        showErrorSnackBar(context, 'Failed to load statistics: ${e.toString()}');
      }
    }
  }
  
  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Period Selector
          _buildPeriodSelector(),
          const SizedBox(height: 20),
          
          // Quick Stats
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Total Tasks',
                  value: _stats['totalTasks']?.toString() ?? '0',
                  icon: Icons.assignment,
                  color: Colors.blue,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Completed',
                  value: _stats['completedTasks']?.toString() ?? '0',
                  icon: Icons.check_circle,
                  color: Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'In Progress',
                  value: _stats['inProgressTasks']?.toString() ?? '0',
                  icon: Icons.pending,
                  color: Colors.orange,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Overdue',
                  value: _stats['overdueTasks']?.toString() ?? '0',
                  icon: Icons.warning,
                  color: Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Completion Rate
          ChartCard(
            title: 'Completion Rate',
            child: _buildCompletionRateChart(),
          ),
          const SizedBox(height: 20),
          
          // Priority Distribution
          ChartCard(
            title: 'Tasks by Priority',
            child: _buildPriorityChart(),
          ),
          const SizedBox(height: 20),
          
          // Category Distribution
          if (_stats['categoryStats'] != null)
            ChartCard(
              title: 'Tasks by Category',
              child: _buildCategoryChart(),
            ),
        ],
      ),
    );
  }
  
  Widget _buildProductivityTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Daily Completion Chart
          ChartCard(
            title: 'Daily Task Completion',
            child: _buildDailyCompletionChart(),
          ),
          const SizedBox(height: 20),
          
          // Productivity Metrics
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Avg. Daily Tasks',
                  value: _stats['avgDailyTasks']?.toStringAsFixed(1) ?? '0.0',
                  icon: Icons.trending_up,
                  color: Colors.purple,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Completion Rate',
                  value: '${(_stats['completionRate'] ?? 0).toStringAsFixed(1)}%',
                  icon: Icons.percent,
                  color: Colors.teal,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Streak Days',
                  value: _stats['streakDays']?.toString() ?? '0',
                  icon: Icons.local_fire_department,
                  color: Colors.orange,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Best Day',
                  value: _stats['bestDay'] ?? 'N/A',
                  icon: Icons.star,
                  color: Colors.amber,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Weekly Pattern
          ChartCard(
            title: 'Weekly Pattern',
            child: _buildWeeklyPatternChart(),
          ),
        ],
      ),
    );
  }
  
  Widget _buildTrendsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Monthly Trends
          ChartCard(
            title: 'Monthly Trends',
            child: _buildMonthlyTrendsChart(),
          ),
          const SizedBox(height: 20),
          
          // Growth Metrics
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'This Month',
                  value: _stats['thisMonthTasks']?.toString() ?? '0',
                  icon: Icons.calendar_month,
                  color: Colors.indigo,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Growth',
                  value: '${(_stats['monthlyGrowth'] ?? 0).toStringAsFixed(1)}%',
                  icon: _stats['monthlyGrowth'] != null && _stats['monthlyGrowth'] >= 0
                      ? Icons.trending_up
                      : Icons.trending_down,
                  color: _stats['monthlyGrowth'] != null && _stats['monthlyGrowth'] >= 0
                      ? Colors.green
                      : Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Achievement Summary
          _buildAchievementSummary(),
        ],
      ),
    );
  }
  
  Widget _buildPeriodSelector() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceVariant,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          _buildPeriodButton('Today', 'today'),
          _buildPeriodButton('Week', 'week'),
          _buildPeriodButton('Month', 'month'),
          _buildPeriodButton('Year', 'year'),
        ],
      ),
    );
  }
  
  Widget _buildPeriodButton(String label, String value) {
    final isSelected = _selectedPeriod == value;
    
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedPeriod = value;
          });
          _loadStats();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Theme.of(context).colorScheme.primary : null,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected
                  ? Theme.of(context).colorScheme.onPrimary
                  : Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildCompletionRateChart() {
    final completedTasks = _stats['completedTasks'] ?? 0;
    final totalTasks = _stats['totalTasks'] ?? 1;
    final completionRate = completedTasks / totalTasks;
    
    return SizedBox(
      height: 200,
      child: PieChart(
        PieChartData(
          sections: [
            PieChartSectionData(
              value: completedTasks.toDouble(),
              color: Colors.green,
              title: 'Completed\n$completedTasks',
              radius: 80,
              titleStyle: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            PieChartSectionData(
              value: (totalTasks - completedTasks).toDouble(),
              color: Colors.grey[300],
              title: 'Remaining\n${totalTasks - completedTasks}',
              radius: 80,
              titleStyle: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.black54,
              ),
            ),
          ],
          centerSpaceRadius: 40,
          sectionsSpace: 2,
        ),
      ),
    );
  }
  
  Widget _buildPriorityChart() {
    final priorityStats = _stats['priorityStats'] as Map<String, dynamic>? ?? {};
    
    return SizedBox(
      height: 200,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: (priorityStats.values.isNotEmpty
              ? priorityStats.values.reduce((a, b) => a > b ? a : b)
              : 10).toDouble(),
          barTouchData: BarTouchData(enabled: false),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  const titles = ['Low', 'Medium', 'High', 'Urgent'];
                  return Text(
                    titles[value.toInt()],
                    style: const TextStyle(fontSize: 12),
                  );
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: [
            BarChartGroupData(
              x: 0,
              barRods: [
                BarChartRodData(
                  toY: (priorityStats['low'] ?? 0).toDouble(),
                  color: Colors.green,
                  width: 20,
                ),
              ],
            ),
            BarChartGroupData(
              x: 1,
              barRods: [
                BarChartRodData(
                  toY: (priorityStats['medium'] ?? 0).toDouble(),
                  color: Colors.orange,
                  width: 20,
                ),
              ],
            ),
            BarChartGroupData(
              x: 2,
              barRods: [
                BarChartRodData(
                  toY: (priorityStats['high'] ?? 0).toDouble(),
                  color: Colors.red,
                  width: 20,
                ),
              ],
            ),
            BarChartGroupData(
              x: 3,
              barRods: [
                BarChartRodData(
                  toY: (priorityStats['urgent'] ?? 0).toDouble(),
                  color: Colors.purple,
                  width: 20,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildCategoryChart() {
    final categoryStats = _stats['categoryStats'] as Map<String, dynamic>? ?? {};
    
    if (categoryStats.isEmpty) {
      return const Center(
        child: Text('No category data available'),
      );
    }
    
    final colors = [Colors.blue, Colors.green, Colors.orange, Colors.purple, Colors.red];
    int colorIndex = 0;
    
    return SizedBox(
      height: 200,
      child: PieChart(
        PieChartData(
          sections: categoryStats.entries.map((entry) {
            final color = colors[colorIndex % colors.length];
            colorIndex++;
            
            return PieChartSectionData(
              value: entry.value.toDouble(),
              color: color,
              title: '${entry.key}\n${entry.value}',
              radius: 60,
              titleStyle: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            );
          }).toList(),
          centerSpaceRadius: 40,
          sectionsSpace: 2,
        ),
      ),
    );
  }
  
  Widget _buildDailyCompletionChart() {
    final dailyStats = _stats['dailyStats'] as List<dynamic>? ?? [];
    
    return SizedBox(
      height: 200,
      child: LineChart(
        LineChartData(
          gridData: FlGridData(show: false),
          titlesData: FlTitlesData(
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  if (value.toInt() < dailyStats.length) {
                    final date = DateTime.parse(dailyStats[value.toInt()]['date']);
                    return Text(
                      '${date.day}/${date.month}',
                      style: const TextStyle(fontSize: 10),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: dailyStats.asMap().entries.map((entry) {
                return FlSpot(
                  entry.key.toDouble(),
                  entry.value['completed'].toDouble(),
                );
              }).toList(),
              isCurved: true,
              color: Colors.blue,
              barWidth: 3,
              dotData: FlDotData(show: true),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildWeeklyPatternChart() {
    final weeklyStats = _stats['weeklyPattern'] as Map<String, dynamic>? ?? {};
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return SizedBox(
      height: 200,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: weeklyStats.values.isNotEmpty
              ? weeklyStats.values.reduce((a, b) => a > b ? a : b).toDouble()
              : 10,
          barTouchData: BarTouchData(enabled: false),
          titlesData: FlTitlesData(
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  return Text(
                    weekdays[value.toInt()],
                    style: const TextStyle(fontSize: 12),
                  );
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: weekdays.asMap().entries.map((entry) {
            final dayName = entry.value.toLowerCase();
            return BarChartGroupData(
              x: entry.key,
              barRods: [
                BarChartRodData(
                  toY: (weeklyStats[dayName] ?? 0).toDouble(),
                  color: Colors.blue,
                  width: 20,
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
  
  Widget _buildMonthlyTrendsChart() {
    final monthlyStats = _stats['monthlyTrends'] as List<dynamic>? ?? [];
    
    return SizedBox(
      height: 200,
      child: LineChart(
        LineChartData(
          gridData: FlGridData(show: false),
          titlesData: FlTitlesData(
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  if (value.toInt() < monthlyStats.length) {
                    final month = monthlyStats[value.toInt()]['month'];
                    return Text(
                      month.toString(),
                      style: const TextStyle(fontSize: 10),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: monthlyStats.asMap().entries.map((entry) {
                return FlSpot(
                  entry.key.toDouble(),
                  entry.value['tasks'].toDouble(),
                );
              }).toList(),
              isCurved: true,
              color: Colors.green,
              barWidth: 3,
              dotData: FlDotData(show: true),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildAchievementSummary() {
    final achievements = _stats['achievements'] as List<dynamic>? ?? [];
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recent Achievements',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            if (achievements.isEmpty)
              const Text('No achievements yet. Keep working!')
            else
              ...achievements.take(5).map((achievement) => ListTile(
                leading: Icon(
                  Icons.emoji_events,
                  color: Colors.amber,
                ),
                title: Text(achievement['title'] ?? ''),
                subtitle: Text(achievement['description'] ?? ''),
                trailing: Text(
                  formatDate(DateTime.parse(achievement['date'])),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                contentPadding: EdgeInsets.zero,
              )),
          ],
        ),
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Productivity'),
            Tab(text: 'Trends'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadStats,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(),
            _buildProductivityTab(),
            _buildTrendsTab(),
          ],
        ),
      ),
    );
  }
}