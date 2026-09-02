import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'providers/city_flow_provider.dart';
import 'screens/home_navigation_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const CityFlowApp());
}

class CityFlowApp extends StatelessWidget {
  const CityFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CityFlowProvider()),
      ],
      child: MaterialApp(
        title: 'CityFlow - Trafic & Itinéraires Yaoundé/Douala',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const HomeNavigationScreen(),
      ),
    );
  }
}
