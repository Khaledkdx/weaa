import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase/supabase.dart';

import 'service_video_embed.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load();
  } catch (_) {
    // Production uses --dart-define. Local .env is optional.
  }
  usePathUrlStrategy();
  runApp(const ProviderScope(child: WeaaApp()));
}

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnv());

final supabaseClientProvider = Provider<SupabaseClient?>((ref) {
  final config = ref.watch(appConfigProvider);
  if (!config.hasSupabase) return null;
  return SupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
});

final cmsRepositoryProvider = Provider<CmsRepository>((ref) {
  final client = ref.watch(supabaseClientProvider);
  if (client == null) return InMemoryCmsRepository();
  return SupabaseCmsRepository(client);
});

final cmsProvider = NotifierProvider<CmsController, CmsContent>(
  CmsController.new,
);

final cmsSyncProvider = NotifierProvider<CmsSyncController, CmsSyncState>(
  CmsSyncController.new,
);

String? youtubeEmbedUrlFrom(String? rawUrl) {
  final value = rawUrl?.trim();
  if (value == null || value.isEmpty) return null;
  final uri = Uri.tryParse(value);
  if (uri == null || !uri.hasScheme) return null;
  final host = uri.host.toLowerCase().replaceFirst(RegExp(r'^www\.'), '');
  String? videoId;
  if (host == 'youtu.be') {
    videoId = uri.pathSegments.isEmpty ? null : uri.pathSegments.first;
  } else if (host == 'youtube.com' ||
      host == 'm.youtube.com' ||
      host == 'youtube-nocookie.com') {
    if (uri.pathSegments.isNotEmpty && uri.pathSegments.first == 'embed') {
      videoId = uri.pathSegments.length > 1 ? uri.pathSegments[1] : null;
    } else if (uri.pathSegments.isNotEmpty &&
        uri.pathSegments.first == 'shorts') {
      videoId = uri.pathSegments.length > 1 ? uri.pathSegments[1] : null;
    } else {
      videoId = uri.queryParameters['v'];
    }
  }
  if (videoId == null || !RegExp(r'^[A-Za-z0-9_-]{6,}$').hasMatch(videoId)) {
    return null;
  }
  return 'https://www.youtube.com/embed/$videoId';
}

final adminAuthProvider = NotifierProvider<AdminAuthController, AdminAuthState>(
  AdminAuthController.new,
);

final _routerProvider = Provider.family<GoRouter, String>((
  ref,
  initialLocation,
) {
  return GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(path: '/', builder: (_, state) => const HomePage()),
      GoRoute(
        path: '/services',
        builder: (_, state) => const GeneralInfoPage(),
      ),
      GoRoute(
        path: '/services/:slug',
        builder: (context, state) =>
            ServiceDetailRoute(slug: state.pathParameters['slug'] ?? ''),
      ),
      GoRoute(
        path: '/frameworks',
        builder: (_, state) => const ServiceModelsPage(),
      ),
      GoRoute(
        path: '/initiatives',
        builder: (_, state) => const InitiativesPage(),
      ),
      GoRoute(path: '/about', builder: (_, state) => const AboutPage()),
      GoRoute(path: '/contact', builder: (_, state) => const ContactPage()),
      GoRoute(path: '/admin', builder: (_, state) => const AdminPage()),
    ],
    errorBuilder: (_, state) => const HomePage(),
  );
});

class WeaaApp extends ConsumerWidget {
  const WeaaApp({super.key, this.initialLocation = '/'});

  final String initialLocation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'WEAA Logistics',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        visualDensity: VisualDensity.standard,
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.accent),
      ),
      routerConfig: ref.watch(_routerProvider(initialLocation)),
    );
  }
}

class AppColors {
  static const background = Color(0xff060b11);
  static const surface = Color(0xff121b28);
  static const surfaceStrong = Color(0xff172338);
  static const ink = Color(0xfff1f7ff);
  static const muted = Color(0xff97a6b8);
  static const accent = Color(0xff57b8ff);
  static const gold = Color(0xffffcc66);
  static const green = Color(0xff2bd49a);
  static const danger = Color(0xffff6b6b);
}

class AppConfig {
  const AppConfig({required this.supabaseUrl, required this.supabaseAnonKey});

  final String supabaseUrl;
  final String supabaseAnonKey;

  bool get hasSupabase => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static AppConfig fromEnv() {
    const defineUrl = String.fromEnvironment('SUPABASE_URL');
    const defineKey = String.fromEnvironment('SUPABASE_ANON_KEY');
    final dotenvValues = _safeDotEnv();
    return AppConfig(
      supabaseUrl: defineUrl.isNotEmpty
          ? defineUrl
          : (dotenvValues['SUPABASE_URL'] ?? ''),
      supabaseAnonKey: defineKey.isNotEmpty
          ? defineKey
          : (dotenvValues['SUPABASE_ANON_KEY'] ?? ''),
    );
  }

  static Map<String, String> _safeDotEnv() {
    try {
      return dotenv.env;
    } catch (_) {
      return const {};
    }
  }
}

class CmsSyncState {
  const CmsSyncState({required this.label, required this.isBusy, this.error});

  const CmsSyncState.ready() : label = 'جاهز', isBusy = false, error = null;

  final String label;
  final bool isBusy;
  final String? error;
}

class CmsSyncController extends Notifier<CmsSyncState> {
  @override
  CmsSyncState build() => const CmsSyncState.ready();

  void loading() => state = const CmsSyncState(label: 'تحميل...', isBusy: true);

  void saving() =>
      state = const CmsSyncState(label: 'جاري الحفظ...', isBusy: true);

  void saved() => state = const CmsSyncState(label: 'تم الحفظ', isBusy: false);

  void failed(Object error) => state = CmsSyncState(
    label: 'تعذر الحفظ',
    isBusy: false,
    error: error.toString(),
  );
}

abstract class CmsRepository {
  Future<CmsContent> load();
  Future<void> save(CmsContent content);
  Future<ServiceRequest> createServiceRequest(ServiceRequest request);
  Future<List<ServiceRequest>> loadServiceRequests();
  Future<void> updateServiceRequestStatus(String requestId, String status);
}

class InMemoryCmsRepository implements CmsRepository {
  CmsContent _content = CmsContent.seed();

  @override
  Future<CmsContent> load() async => _content;

  @override
  Future<void> save(CmsContent content) async {
    _content = content;
  }

  @override
  Future<ServiceRequest> createServiceRequest(ServiceRequest request) async {
    final stored = request.id.isEmpty ? request.withGeneratedId() : request;
    _content = _content.copyWith(
      serviceRequests: [stored, ..._content.serviceRequests],
    );
    return stored;
  }

  @override
  Future<List<ServiceRequest>> loadServiceRequests() async {
    return _content.serviceRequests;
  }

  @override
  Future<void> updateServiceRequestStatus(
    String requestId,
    String status,
  ) async {
    _content = _content.copyWith(
      serviceRequests: [
        for (final request in _content.serviceRequests)
          if (request.id == requestId)
            request.copyWith(status: status)
          else
            request,
      ],
    );
  }
}

class SupabaseCmsRepository implements CmsRepository {
  SupabaseCmsRepository(this.client);

  final SupabaseClient client;

  @override
  Future<CmsContent> load() async {
    final response = await client
        .from('cms_content')
        .select('content')
        .eq('id', 'main')
        .maybeSingle();
    final content = response == null
        ? CmsContent.seed()
        : CmsContent.fromJson(
            Map<String, dynamic>.from(response['content'] as Map),
          );
    final requests = await loadServiceRequests();
    return content.copyWith(serviceRequests: requests);
  }

  @override
  Future<void> save(CmsContent content) async {
    await client.from('cms_content').upsert({
      'id': 'main',
      'content': content.toJson(includeRequests: false),
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  @override
  Future<ServiceRequest> createServiceRequest(ServiceRequest request) async {
    final response = await client
        .from('service_requests')
        .insert(request.toJson(includeId: false))
        .select()
        .single();
    return ServiceRequest.fromJson(Map<String, dynamic>.from(response));
  }

  @override
  Future<List<ServiceRequest>> loadServiceRequests() async {
    final response = await client
        .from('service_requests')
        .select()
        .order('created_at', ascending: false);
    return [
      for (final item in response)
        ServiceRequest.fromJson(Map<String, dynamic>.from(item as Map)),
    ];
  }

  @override
  Future<void> updateServiceRequestStatus(
    String requestId,
    String status,
  ) async {
    await client
        .from('service_requests')
        .update({'status': status})
        .eq('id', requestId);
  }
}

class AdminAuthState {
  const AdminAuthState({
    required this.isLoading,
    required this.isAuthenticated,
    required this.isConfigured,
    this.email,
    this.error,
  });

  const AdminAuthState.loading()
    : isLoading = true,
      isAuthenticated = false,
      isConfigured = false,
      email = null,
      error = null;

  final bool isLoading;
  final bool isAuthenticated;
  final bool isConfigured;
  final String? email;
  final String? error;
}

class AdminAuthController extends Notifier<AdminAuthState> {
  SupabaseClient? get _client => ref.read(supabaseClientProvider);

  @override
  AdminAuthState build() {
    final client = ref.watch(supabaseClientProvider);
    if (client == null) {
      return const AdminAuthState(
        isLoading: false,
        isAuthenticated: true,
        isConfigured: false,
      );
    }
    final user = client.auth.currentUser;
    return AdminAuthState(
      isLoading: false,
      isAuthenticated: user != null,
      isConfigured: true,
      email: user?.email,
    );
  }

  Future<void> signIn(String email, String password) async {
    final client = _client;
    if (client == null) return;
    state = AdminAuthState(
      isLoading: true,
      isAuthenticated: false,
      isConfigured: true,
      email: email,
    );
    try {
      final response = await client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      state = AdminAuthState(
        isLoading: false,
        isAuthenticated: response.user != null,
        isConfigured: true,
        email: response.user?.email ?? email,
      );
      unawaited(ref.read(cmsProvider.notifier).refresh());
    } catch (error) {
      state = AdminAuthState(
        isLoading: false,
        isAuthenticated: false,
        isConfigured: true,
        email: email,
        error: 'تعذر تسجيل الدخول. تأكد من البريد وكلمة المرور.',
      );
    }
  }

  Future<void> signOut() async {
    final client = _client;
    if (client == null) return;
    await client.auth.signOut();
    state = const AdminAuthState(
      isLoading: false,
      isAuthenticated: false,
      isConfigured: true,
    );
  }
}

class CmsController extends Notifier<CmsContent> {
  bool _hasCommittedLocalChange = false;

  @override
  CmsContent build() {
    final repository = ref.watch(cmsRepositoryProvider);
    Future.microtask(() => _load(repository));
    return CmsContent.seed();
  }

  Future<void> _load(CmsRepository repository) async {
    ref.read(cmsSyncProvider.notifier).loading();
    try {
      final content = await repository.load();
      if (!_hasCommittedLocalChange) {
        state = content;
      }
      ref.read(cmsSyncProvider.notifier).saved();
    } catch (error) {
      ref.read(cmsSyncProvider.notifier).failed(error);
    }
  }

  Future<void> refresh() async {
    _hasCommittedLocalChange = false;
    await _load(ref.read(cmsRepositoryProvider));
  }

  Future<void> _commit(CmsContent content) async {
    _hasCommittedLocalChange = true;
    state = content;
    ref.read(cmsSyncProvider.notifier).saving();
    try {
      await ref.read(cmsRepositoryProvider).save(content);
      ref.read(cmsSyncProvider.notifier).saved();
    } catch (error) {
      ref.read(cmsSyncProvider.notifier).failed(error);
      rethrow;
    }
  }

  Future<void> updateCompany({
    String? nameAr,
    String? taglineAr,
    String? phone,
    String? email,
    String? headquarters,
    String? vision,
    String? mission,
  }) {
    return _commit(
      state.copyWith(
        company: state.company.copyWith(
          nameAr: nameAr,
          taglineAr: taglineAr,
          phone: phone,
          email: email,
          headquarters: headquarters,
          vision: vision,
          mission: mission,
        ),
      ),
    );
  }

  Future<void> updatePage(String key, {String? title, String? body}) {
    final pages = {...state.pages};
    final current = pages[key] ?? const PageContent('', '', '');
    pages[key] = current.copyWith(title: title, body: body);
    return _commit(state.copyWith(pages: pages));
  }

  Future<void> updateItem({
    required CmsCollection collection,
    required int index,
    String? titleAr,
    String? description,
    String? videoUrl,
  }) {
    final items = [..._itemsFor(collection)];
    items[index] = items[index].copyWith(
      titleAr: titleAr,
      description: description,
      videoUrl: videoUrl,
    );
    return _commit(_contentWith(collection, items));
  }

  Future<void> updateReview(
    String serviceSlug,
    int reviewIndex, {
    String? customer,
    String? body,
  }) {
    final services = [...state.serviceModels];
    final serviceIndex = services.indexWhere(
      (item) => item.slug == serviceSlug,
    );
    if (serviceIndex == -1) return Future.value();
    final reviews = [...services[serviceIndex].reviews];
    if (reviewIndex < 0 || reviewIndex >= reviews.length) return Future.value();
    reviews[reviewIndex] = reviews[reviewIndex].copyWith(
      customer: customer,
      body: body,
    );
    services[serviceIndex] = services[serviceIndex].copyWith(reviews: reviews);
    return _commit(state.copyWith(serviceModels: services));
  }

  Future<void> addReview(String serviceSlug, CmsReview review) {
    final services = [...state.serviceModels];
    final serviceIndex = services.indexWhere(
      (item) => item.slug == serviceSlug,
    );
    if (serviceIndex == -1) return Future.value();
    final reviews = [review, ...services[serviceIndex].reviews];
    services[serviceIndex] = services[serviceIndex].copyWith(reviews: reviews);
    return _commit(state.copyWith(serviceModels: services));
  }

  Future<void> deleteReview(String serviceSlug, int reviewIndex) {
    final services = [...state.serviceModels];
    final serviceIndex = services.indexWhere(
      (item) => item.slug == serviceSlug,
    );
    if (serviceIndex == -1) return Future.value();
    final reviews = [...services[serviceIndex].reviews];
    if (reviewIndex < 0 || reviewIndex >= reviews.length) return Future.value();
    reviews.removeAt(reviewIndex);
    services[serviceIndex] = services[serviceIndex].copyWith(reviews: reviews);
    return _commit(state.copyWith(serviceModels: services));
  }

  Future<void> submitServiceRequest(ServiceRequest request) async {
    ref.read(cmsSyncProvider.notifier).saving();
    try {
      final stored = await ref
          .read(cmsRepositoryProvider)
          .createServiceRequest(request);
      state = state.copyWith(
        serviceRequests: [stored, ...state.serviceRequests],
      );
      ref.read(cmsSyncProvider.notifier).saved();
    } catch (error) {
      ref.read(cmsSyncProvider.notifier).failed(error);
      rethrow;
    }
  }

  Future<void> updateServiceRequestStatus(
    String requestId,
    String status,
  ) async {
    final requests = [
      for (final request in state.serviceRequests)
        if (request.id == requestId)
          request.copyWith(status: status)
        else
          request,
    ];
    state = state.copyWith(serviceRequests: requests);
    ref.read(cmsSyncProvider.notifier).saving();
    try {
      await ref
          .read(cmsRepositoryProvider)
          .updateServiceRequestStatus(requestId, status);
      ref.read(cmsSyncProvider.notifier).saved();
    } catch (error) {
      ref.read(cmsSyncProvider.notifier).failed(error);
      rethrow;
    }
  }

  Future<void> updateFormLabel(int index, String label) {
    final labels = [...state.formLabels];
    labels[index] = label;
    return _commit(state.copyWith(formLabels: labels));
  }

  List<CmsItem> _itemsFor(CmsCollection collection) {
    return switch (collection) {
      CmsCollection.generalInfo => state.generalInfo,
      CmsCollection.serviceModels => state.serviceModels,
      CmsCollection.initiatives => state.initiatives,
    };
  }

  CmsContent _contentWith(CmsCollection collection, List<CmsItem> items) {
    return switch (collection) {
      CmsCollection.generalInfo => state.copyWith(generalInfo: items),
      CmsCollection.serviceModels => state.copyWith(serviceModels: items),
      CmsCollection.initiatives => state.copyWith(initiatives: items),
    };
  }
}

enum CmsCollection { generalInfo, serviceModels, initiatives }

class CmsContent {
  const CmsContent({
    required this.company,
    required this.pages,
    required this.generalInfo,
    required this.serviceModels,
    required this.initiatives,
    required this.values,
    required this.formLabels,
    required this.serviceRequests,
  });

  final CompanyContent company;
  final Map<String, PageContent> pages;
  final List<CmsItem> generalInfo;
  final List<CmsItem> serviceModels;
  final List<CmsItem> initiatives;
  final List<String> values;
  final List<String> formLabels;
  final List<ServiceRequest> serviceRequests;

  static CmsContent seed() {
    return const CmsContent(
      company: CompanyContent(
        nameAr: 'شركة وعاء للخدمات اللوجستية والإدارية',
        nameEn: 'WEAA Company for Logistics and Administrative Services',
        taglineAr: 'الطبقة الأولى المتكاملة في عالم اللوجستيات',
        taglineEn: 'The Integrated First Layer in the World of Logistics',
        phone: '+966567018977',
        email: 'info@weaa-sa.com',
        website: 'https://weaa-sa.com',
        headquarters: 'جدة، حي المروة، شارع عبدالله اليماني',
        vat: '314375725200003',
        cr: '7052452385',
        vision:
            'أن تكون وعاء المنصة اللوجستية الإقليمية الأكثر تنظيمًا وتأثيرًا، عبر نموذج حوكمة قابل للتكرار والتوسع.',
        mission:
            'تمكين المستثمرين ورواد الأعمال من الدخول المنظم إلى قطاع اللوجستيك، عبر توفير البنية التشغيلية والإدارية المتكاملة.',
      ),
      pages: {
        'home': PageContent(
          'الواجهة المعتمدة',
          'منصة لوجستية وإدارية قابلة للقياس',
          'كل محتوى هذه الصفحة أصبح قابلًا للإدارة من لوحة الأدمن.',
        ),
        'services': PageContent(
          'معلومات عامة',
          'القطاعات التي تعمل داخل وعاء',
          'هذه الصفحة تشرح مجالات التشغيل العامة فقط.',
        ),
        'frameworks': PageContent(
          'الخدمات',
          'اختر الخدمة المناسبة من نماذج وعاء',
          'النماذج الثلاثة هي خدمات وعاء الأساسية.',
        ),
        'initiatives': PageContent(
          'المبادرات',
          'القطاع لا يكبر بالأرقام وحدها',
          'مبادرات وعاء تضع العامل، العميل، والمستثمر داخل منظومة أوضح.',
        ),
        'about': PageContent(
          'من نحن',
          'وعاء تبني طبقة تشغيل أولى للوجستيات',
          'شركة سعودية من جدة، تعمل على نموذج إداري ولوجستي قابل للتوسع.',
        ),
        'contact': PageContent(
          'تواصل',
          'ابدأ المحادثة من قناة واضحة',
          'هذه الصفحة جاهزة لاحقًا للربط مع صندوق رسائل Supabase.',
        ),
        'admin': PageContent(
          'لوحة الأدمن',
          'إدارة محتوى WEAA',
          'تعديل صفحات الموقع، الخدمات، الفيديوهات، الريڤيوز، وبيانات الشركة.',
        ),
      },
      generalInfo: [
        CmsItem(
          'التخزين',
          'Warehousing',
          'إدارة السعة والمخزون ونقاط الجاهزية داخل شبكة تشغيل واحدة.',
          Icons.warehouse_rounded,
        ),
        CmsItem(
          'التوصيل للمستهلك B2C',
          'B2C Delivery',
          'تسليم مباشر يضبط تجربة العميل النهائي ويجعل آخر ميل قابلًا للقياس.',
          Icons.delivery_dining_rounded,
        ),
        CmsItem(
          'الشحن بين المدن B2B',
          'B2B Intercity Shipping',
          'مسارات بين المدن للشركات مع وضوح في التكلفة والزمن والمسؤولية.',
          Icons.local_shipping_rounded,
        ),
        CmsItem(
          'الشحن الدولي',
          'International Shipping',
          'مد جسور التوريد عالميًا بنموذج قراءة أدق للمخاطر والوقت.',
          Icons.flight_takeoff_rounded,
        ),
        CmsItem(
          'الخدمات الإدارية والاستشارية',
          'Administrative & Consultancy',
          'بنية إدارية واستشارية تحول الفكرة إلى مشروع قابل للتشغيل.',
          Icons.business_center_rounded,
        ),
      ],
      serviceModels: [
        CmsItem(
          'القبة الحديدية',
          'Iron Dome',
          'تشغيل وإدارة أصول الغير من خلال حوكمة تضبط الأداء والمسؤولية.',
          Icons.security_rounded,
          slug: 'iron-dome',
          videoUrl: 'https://weaa-sa.com/videos/iron-dome',
          benefits: [
            'حوكمة تشغيل الأصول',
            'مراقبة الأداء والمسؤوليات',
            'تقارير قرار للإدارة',
          ],
          reviews: [
            CmsReview(
              'مالك أصول لوجستية',
              'النموذج وضح لنا كيف ندير الأصل بدون فوضى تشغيلية.',
              'قبل 3 أسابيع',
              5,
            ),
            CmsReview(
              'شركة تشغيل',
              'أهم قيمة كانت فصل المسؤوليات وتوثيق مؤشرات الأداء.',
              'قبل شهر',
              5,
            ),
          ],
        ),
        CmsItem(
          'الهرم الماسي',
          'Diamond Pyramid',
          'تجهيز المشروع الكامل كنموذج قابل للتكرار والتوسع التجاري.',
          Icons.diamond_rounded,
          slug: 'diamond-pyramid',
          videoUrl: 'https://weaa-sa.com/videos/diamond-pyramid',
          benefits: [
            'تجهيز نموذج مشروع كامل',
            'خطة تشغيل قابلة للتكرار',
            'مخرجات مناسبة للفرنشايز',
          ],
          reviews: [
            CmsReview(
              'رائد أعمال',
              'حولوا الفكرة إلى مراحل واضحة بدل قائمة مهام مبعثرة.',
              'قبل أسبوعين',
              5,
            ),
            CmsReview(
              'مستثمر ناشئ',
              'النموذج ساعدني أفهم تكلفة الإطلاق وما بعد الإطلاق.',
              'قبل شهرين',
              4,
            ),
          ],
        ),
        CmsItem(
          'المثلث الذهبي',
          'Golden Triangle',
          'تحالفات واندماجات تساعد الأطراف على تقاسم الفرص بوضوح.',
          Icons.hub_rounded,
          slug: 'golden-triangle',
          videoUrl: 'https://weaa-sa.com/videos/golden-triangle',
          benefits: [
            'تنظيم التحالفات',
            'توزيع واضح للأدوار',
            'قراءة فرص الاندماج',
          ],
          reviews: [
            CmsReview(
              'شركة توزيع',
              'ساعدونا نقرأ التحالف بطريقة عملية قبل أي التزام.',
              'قبل 5 أسابيع',
              5,
            ),
            CmsReview(
              'مكتب استثمار',
              'خرجنا بصورة أوضح عن أدوار كل طرف ومناطق المخاطرة.',
              'قبل 3 أشهر',
              4,
            ),
          ],
        ),
      ],
      initiatives: [
        CmsItem(
          'عدّي على يدي',
          'Humanized Delivery',
          'أنسنة عمليات التوصيل وتحويل الخدمة اليومية إلى علاقة أكثر احترامًا.',
          Icons.volunteer_activism_rounded,
        ),
        CmsItem(
          'إنت باشا',
          'Work Relationship Clarity',
          'ضبط علاقة العامل وصاحب العمل بلغة واضحة وعادلة.',
          Icons.badge_rounded,
        ),
        CmsItem(
          'عينك وعونك',
          'GCC Investment Bridge',
          'جذب الاستثمارات الخليجية عبر نموذج سعودي قابل للفهم والثقة.',
          Icons.public_rounded,
        ),
      ],
      values: [
        'النفع المتبادل',
        'الوضوح',
        'المصداقية',
        'الأمانة',
        'العدالة في الفرص',
      ],
      formLabels: [
        'الاسم الكامل',
        'رقم الجوال',
        'البريد الإلكتروني',
        'نوع الخدمة',
        'تفاصيل الطلب',
      ],
      serviceRequests: [],
    );
  }

  CmsContent copyWith({
    CompanyContent? company,
    Map<String, PageContent>? pages,
    List<CmsItem>? generalInfo,
    List<CmsItem>? serviceModels,
    List<CmsItem>? initiatives,
    List<String>? values,
    List<String>? formLabels,
    List<ServiceRequest>? serviceRequests,
  }) {
    return CmsContent(
      company: company ?? this.company,
      pages: pages ?? this.pages,
      generalInfo: generalInfo ?? this.generalInfo,
      serviceModels: serviceModels ?? this.serviceModels,
      initiatives: initiatives ?? this.initiatives,
      values: values ?? this.values,
      formLabels: formLabels ?? this.formLabels,
      serviceRequests: serviceRequests ?? this.serviceRequests,
    );
  }

  Map<String, dynamic> toJson({bool includeRequests = true}) {
    return {
      'company': company.toJson(),
      'pages': pages.map((key, value) => MapEntry(key, value.toJson())),
      'generalInfo': [for (final item in generalInfo) item.toJson()],
      'serviceModels': [for (final item in serviceModels) item.toJson()],
      'initiatives': [for (final item in initiatives) item.toJson()],
      'values': values,
      'formLabels': formLabels,
      if (includeRequests)
        'serviceRequests': [
          for (final request in serviceRequests) request.toJson(),
        ],
    };
  }

  static CmsContent fromJson(Map<String, dynamic> json) {
    final seed = CmsContent.seed();
    return CmsContent(
      company: json['company'] is Map
          ? CompanyContent.fromJson(
              Map<String, dynamic>.from(json['company'] as Map),
            )
          : seed.company,
      pages: json['pages'] is Map
          ? {
              for (final entry in (json['pages'] as Map).entries)
                entry.key.toString(): PageContent.fromJson(
                  Map<String, dynamic>.from(entry.value as Map),
                ),
            }
          : seed.pages,
      generalInfo: _itemsFromJson(json['generalInfo'], seed.generalInfo),
      serviceModels: _itemsFromJson(json['serviceModels'], seed.serviceModels),
      initiatives: _itemsFromJson(json['initiatives'], seed.initiatives),
      values: json['values'] is List
          ? [for (final value in json['values'] as List) value.toString()]
          : seed.values,
      formLabels: json['formLabels'] is List
          ? [for (final value in json['formLabels'] as List) value.toString()]
          : seed.formLabels,
      serviceRequests: json['serviceRequests'] is List
          ? [
              for (final item in json['serviceRequests'] as List)
                ServiceRequest.fromJson(Map<String, dynamic>.from(item as Map)),
            ]
          : const [],
    );
  }

  static List<CmsItem> _itemsFromJson(Object? source, List<CmsItem> fallback) {
    if (source is! List) return fallback;
    return [
      for (var i = 0; i < source.length; i++)
        CmsItem.fromJson(
          Map<String, dynamic>.from(source[i] as Map),
          fallback.length > i ? fallback[i] : null,
        ),
    ];
  }
}

class CompanyContent {
  const CompanyContent({
    required this.nameAr,
    required this.nameEn,
    required this.taglineAr,
    required this.taglineEn,
    required this.phone,
    required this.email,
    required this.website,
    required this.headquarters,
    required this.vat,
    required this.cr,
    required this.vision,
    required this.mission,
  });

  final String nameAr;
  final String nameEn;
  final String taglineAr;
  final String taglineEn;
  final String phone;
  final String email;
  final String website;
  final String headquarters;
  final String vat;
  final String cr;
  final String vision;
  final String mission;

  CompanyContent copyWith({
    String? nameAr,
    String? nameEn,
    String? taglineAr,
    String? taglineEn,
    String? phone,
    String? email,
    String? website,
    String? headquarters,
    String? vat,
    String? cr,
    String? vision,
    String? mission,
  }) {
    return CompanyContent(
      nameAr: nameAr ?? this.nameAr,
      nameEn: nameEn ?? this.nameEn,
      taglineAr: taglineAr ?? this.taglineAr,
      taglineEn: taglineEn ?? this.taglineEn,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      website: website ?? this.website,
      headquarters: headquarters ?? this.headquarters,
      vat: vat ?? this.vat,
      cr: cr ?? this.cr,
      vision: vision ?? this.vision,
      mission: mission ?? this.mission,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'nameAr': nameAr,
      'nameEn': nameEn,
      'taglineAr': taglineAr,
      'taglineEn': taglineEn,
      'phone': phone,
      'email': email,
      'website': website,
      'headquarters': headquarters,
      'vat': vat,
      'cr': cr,
      'vision': vision,
      'mission': mission,
    };
  }

  static CompanyContent fromJson(Map<String, dynamic> json) {
    final seed = CmsContent.seed().company;
    return CompanyContent(
      nameAr: json['nameAr']?.toString() ?? seed.nameAr,
      nameEn: json['nameEn']?.toString() ?? seed.nameEn,
      taglineAr: json['taglineAr']?.toString() ?? seed.taglineAr,
      taglineEn: json['taglineEn']?.toString() ?? seed.taglineEn,
      phone: json['phone']?.toString() ?? seed.phone,
      email: json['email']?.toString() ?? seed.email,
      website: json['website']?.toString() ?? seed.website,
      headquarters: json['headquarters']?.toString() ?? seed.headquarters,
      vat: json['vat']?.toString() ?? seed.vat,
      cr: json['cr']?.toString() ?? seed.cr,
      vision: json['vision']?.toString() ?? seed.vision,
      mission: json['mission']?.toString() ?? seed.mission,
    );
  }
}

class PageContent {
  const PageContent(this.kicker, this.title, this.body);

  final String kicker;
  final String title;
  final String body;

  PageContent copyWith({String? kicker, String? title, String? body}) {
    return PageContent(
      kicker ?? this.kicker,
      title ?? this.title,
      body ?? this.body,
    );
  }

  Map<String, dynamic> toJson() {
    return {'kicker': kicker, 'title': title, 'body': body};
  }

  static PageContent fromJson(Map<String, dynamic> json) {
    return PageContent(
      json['kicker']?.toString() ?? '',
      json['title']?.toString() ?? '',
      json['body']?.toString() ?? '',
    );
  }
}

class CmsItem {
  const CmsItem(
    this.titleAr,
    this.titleEn,
    this.description,
    this.icon, {
    this.slug,
    this.videoUrl,
    this.benefits = const [],
    this.reviews = const [],
  });

  final String titleAr;
  final String titleEn;
  final String description;
  final IconData icon;
  final String? slug;
  final String? videoUrl;
  final List<String> benefits;
  final List<CmsReview> reviews;

  CmsItem copyWith({
    String? titleAr,
    String? titleEn,
    String? description,
    String? videoUrl,
    List<CmsReview>? reviews,
  }) {
    return CmsItem(
      titleAr ?? this.titleAr,
      titleEn ?? this.titleEn,
      description ?? this.description,
      icon,
      slug: slug,
      videoUrl: videoUrl ?? this.videoUrl,
      benefits: benefits,
      reviews: reviews ?? this.reviews,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'titleAr': titleAr,
      'titleEn': titleEn,
      'description': description,
      'iconCodePoint': icon.codePoint,
      'slug': slug,
      'videoUrl': videoUrl,
      'benefits': benefits,
      'reviews': [for (final review in reviews) review.toJson()],
    };
  }

  static CmsItem fromJson(Map<String, dynamic> json, CmsItem? fallback) {
    return CmsItem(
      json['titleAr']?.toString() ?? fallback?.titleAr ?? '',
      json['titleEn']?.toString() ?? fallback?.titleEn ?? '',
      json['description']?.toString() ?? fallback?.description ?? '',
      fallback?.icon ?? Icons.circle_rounded,
      slug: json['slug']?.toString() ?? fallback?.slug,
      videoUrl: json['videoUrl']?.toString() ?? fallback?.videoUrl,
      benefits: json['benefits'] is List
          ? [for (final item in json['benefits'] as List) item.toString()]
          : fallback?.benefits ?? const [],
      reviews: json['reviews'] is List
          ? [
              for (final item in json['reviews'] as List)
                CmsReview.fromJson(Map<String, dynamic>.from(item as Map)),
            ]
          : fallback?.reviews ?? const [],
    );
  }
}

class CmsReview {
  const CmsReview(this.customer, this.body, this.dateLabel, this.rating);

  final String customer;
  final String body;
  final String dateLabel;
  final int rating;

  CmsReview copyWith({String? customer, String? body}) {
    return CmsReview(
      customer ?? this.customer,
      body ?? this.body,
      dateLabel,
      rating,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'customer': customer,
      'body': body,
      'dateLabel': dateLabel,
      'rating': rating,
    };
  }

  static CmsReview fromJson(Map<String, dynamic> json) {
    return CmsReview(
      json['customer']?.toString() ?? '',
      json['body']?.toString() ?? '',
      json['dateLabel']?.toString() ?? '',
      json['rating'] is int ? json['rating'] as int : 5,
    );
  }
}

class ServiceRequest {
  const ServiceRequest({
    this.id = '',
    required this.serviceSlug,
    required this.serviceTitle,
    required this.name,
    required this.phone,
    required this.email,
    required this.details,
    required this.createdAtLabel,
    this.status = 'طلب جديد',
  });

  final String id;
  final String serviceSlug;
  final String serviceTitle;
  final String name;
  final String phone;
  final String email;
  final String details;
  final String createdAtLabel;
  final String status;

  ServiceRequest withGeneratedId() {
    return copyWith(
      id: id.isEmpty ? DateTime.now().microsecondsSinceEpoch.toString() : id,
      createdAtLabel: createdAtLabel,
    );
  }

  ServiceRequest copyWith({
    String? id,
    String? serviceSlug,
    String? serviceTitle,
    String? name,
    String? phone,
    String? email,
    String? details,
    String? createdAtLabel,
    String? status,
  }) {
    return ServiceRequest(
      id: id ?? this.id,
      serviceSlug: serviceSlug ?? this.serviceSlug,
      serviceTitle: serviceTitle ?? this.serviceTitle,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      details: details ?? this.details,
      createdAtLabel: createdAtLabel ?? this.createdAtLabel,
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toJson({bool includeId = true}) {
    return {
      if (includeId && id.isNotEmpty) 'id': id,
      'service_slug': serviceSlug,
      'service_title': serviceTitle,
      'name': name,
      'phone': phone,
      'email': email,
      'details': details,
      'created_at_label': createdAtLabel,
      'status': status,
    };
  }

  static ServiceRequest fromJson(Map<String, dynamic> json) {
    final createdAt = json['created_at']?.toString();
    return ServiceRequest(
      id: json['id']?.toString() ?? '',
      serviceSlug:
          json['service_slug']?.toString() ??
          json['serviceSlug']?.toString() ??
          '',
      serviceTitle:
          json['service_title']?.toString() ??
          json['serviceTitle']?.toString() ??
          '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      details: json['details']?.toString() ?? '',
      createdAtLabel:
          json['created_at_label']?.toString() ??
          json['createdAtLabel']?.toString() ??
          (createdAt == null ? 'الآن' : 'من Supabase'),
      status: json['status']?.toString() ?? 'طلب جديد',
    );
  }
}

class NavItem {
  const NavItem(this.label, this.path, this.icon);

  final String label;
  final String path;
  final IconData icon;
}

const navItems = [
  NavItem('الرئيسية', '/', Icons.dashboard_rounded),
  NavItem('معلومات عامة', '/services', Icons.route_rounded),
  NavItem('الخدمات', '/frameworks', Icons.account_tree_rounded),
  NavItem('المبادرات', '/initiatives', Icons.diversity_3_rounded),
  NavItem('من نحن', '/about', Icons.apartment_rounded),
  NavItem('تواصل', '/contact', Icons.mark_email_unread_rounded),
];

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cms = ref.watch(cmsProvider);
    final page = cms.pages['home']!;
    return AppShell(
      activePath: '/',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          HeroSection(cms: cms, page: page),
          SectionHeader(page: cms.pages['services']!),
          ResponsiveCards(
            items: cms.generalInfo,
            featuredCount: cms.generalInfo.length,
          ),
          SectionHeader(page: cms.pages['frameworks']!),
          ResponsiveCards(
            items: cms.serviceModels,
            featuredCount: cms.serviceModels.length,
          ),
          SectionHeader(
            page: const PageContent(
              'الثقة والحوكمة',
              'بيانات واضحة من أول زيارة',
              'السجل، الرقم الضريبي، والقنوات الرسمية تظهر من CMS واحد.',
            ),
          ),
          TrustPanel(company: cms.company),
          FinalCta(company: cms.company),
        ],
      ),
    );
  }
}

class GeneralInfoPage extends ConsumerWidget {
  const GeneralInfoPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cms = ref.watch(cmsProvider);
    return AppShell(
      activePath: '/services',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHero(page: cms.pages['services']!),
          ResponsiveCards(
            items: cms.generalInfo,
            featuredCount: cms.generalInfo.length,
          ),
          const OperationsMatrix(),
          FinalCta(company: cms.company),
        ],
      ),
    );
  }
}

class ServiceModelsPage extends ConsumerWidget {
  const ServiceModelsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cms = ref.watch(cmsProvider);
    return AppShell(
      activePath: '/frameworks',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHero(page: cms.pages['frameworks']!),
          ResponsiveCards(
            items: cms.serviceModels,
            featuredCount: cms.serviceModels.length,
          ),
          FrameworkStrip(items: cms.serviceModels),
          FinalCta(company: cms.company),
        ],
      ),
    );
  }
}

class ServiceDetailRoute extends ConsumerWidget {
  const ServiceDetailRoute({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cms = ref.watch(cmsProvider);
    final matches = cms.serviceModels.where((item) => item.slug == slug);
    if (matches.isEmpty) return const GeneralInfoPage();
    return ServiceDetailPage(service: matches.first, cms: cms);
  }
}

class ServiceDetailPage extends StatelessWidget {
  const ServiceDetailPage({
    required this.service,
    required this.cms,
    super.key,
  });

  final CmsItem service;
  final CmsContent cms;

  @override
  Widget build(BuildContext context) {
    final related = cms.serviceModels
        .where((item) => item.slug != service.slug)
        .toList();
    return AppShell(
      activePath: '/frameworks',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ServiceDetailHero(service: service),
          SectionHeader(
            page: const PageContent(
              'فيديو الخدمة',
              'شاهد شرح سريع قبل إرسال الطلب',
              'شاهد الفيديو التعريفي للخدمة قبل تعبئة الطلب.',
            ),
          ),
          VideoPanel(service: service),
          SectionHeader(
            page: const PageContent(
              'طلب الخدمة',
              'فورم مخصص للخدمة المختارة',
              'أرسل بياناتك وسيصل الطلب إلى فريق وعاء للمتابعة.',
            ),
          ),
          ServiceRequestForm(service: service, labels: cms.formLabels),
          SectionHeader(
            page: const PageContent(
              'آراء العملاء',
              'ماذا يقول العملاء عن الخدمة؟',
              'تجارب مختصرة من عملاء تعاملوا مع الخدمة.',
            ),
          ),
          ReviewsGrid(reviews: service.reviews),
          SectionHeader(
            page: const PageContent(
              'خدمات مرتبطة',
              'مسارات أخرى قد تحتاجها',
              'كل خدمة داخل وعاء مرتبطة بطبقة تشغيل أوسع.',
            ),
          ),
          ResponsiveCards(items: related, featuredCount: related.length),
          FinalCta(company: cms.company),
        ],
      ),
    );
  }
}

class InitiativesPage extends ConsumerWidget {
  const InitiativesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cms = ref.watch(cmsProvider);
    return AppShell(
      activePath: '/initiatives',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHero(page: cms.pages['initiatives']!),
          ResponsiveCards(
            items: cms.initiatives,
            featuredCount: cms.initiatives.length,
          ),
          ValuesBand(values: cms.values),
          FinalCta(company: cms.company),
        ],
      ),
    );
  }
}

class AboutPage extends ConsumerWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cms = ref.watch(cmsProvider);
    return AppShell(
      activePath: '/about',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHero(page: cms.pages['about']!),
          VisionMissionPanel(company: cms.company),
          ValuesBand(values: cms.values),
          TrustPanel(company: cms.company),
        ],
      ),
    );
  }
}

class ContactPage extends ConsumerWidget {
  const ContactPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cms = ref.watch(cmsProvider);
    return AppShell(
      activePath: '/contact',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHero(page: cms.pages['contact']!),
          ContactPanel(company: cms.company, labels: cms.formLabels),
          TrustPanel(company: cms.company),
        ],
      ),
    );
  }
}

class AdminPage extends ConsumerWidget {
  const AdminPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(adminAuthProvider);
    final cms = ref.watch(cmsProvider);
    final page = cms.pages['admin']!;
    return AppShell(
      activePath: '/admin',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PageHero(page: page),
          AdminModeBanner(auth: auth),
          const SizedBox(height: 18),
          if (auth.isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(color: AppColors.accent),
              ),
            )
          else if (!auth.isAuthenticated)
            const AdminLoginPanel()
          else
            AdminDashboard(cms: cms),
        ],
      ),
    );
  }
}

class AppShell extends ConsumerWidget {
  const AppShell({required this.activePath, required this.child, super.key});

  final String activePath;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final company = ref.watch(cmsProvider).company;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Stack(
          children: [
            const Positioned.fill(child: AppAtmosphere()),
            SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TopNavigation(activePath: activePath, company: company),
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1220),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 18),
                          child: child,
                        ),
                      ),
                    ),
                    Footer(company: company),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TopNavigation extends StatelessWidget {
  const TopNavigation({
    required this.activePath,
    required this.company,
    super.key,
  });

  final String activePath;
  final CompanyContent company;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 920;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        compact ? 16 : 38,
        18,
        compact ? 16 : 38,
        12,
      ),
      child: Row(
        children: [
          const LogoMark(),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  company.nameAr,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: appText(
                    fontSize: compact ? 13 : 16,
                    color: AppColors.ink,
                    weight: FontWeight.w900,
                  ),
                ),
                Text(
                  company.taglineEn,
                  textDirection: TextDirection.ltr,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: appText(
                    fontSize: 11,
                    color: AppColors.muted,
                    weight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          if (!compact) NavDock(activePath: activePath),
          if (compact)
            IconButton(
              tooltip: 'القائمة',
              icon: const Icon(Icons.menu_rounded, color: AppColors.ink),
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                backgroundColor: AppColors.surface,
                builder: (_) => Directionality(
                  textDirection: TextDirection.rtl,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Wrap(
                      runSpacing: 10,
                      children: [
                        for (final item in navItems)
                          ListTile(
                            leading: Icon(
                              item.icon,
                              color: item.path == activePath
                                  ? AppColors.accent
                                  : AppColors.muted,
                            ),
                            title: Text(
                              item.label,
                              style: appText(
                                color: AppColors.ink,
                                weight: FontWeight.w800,
                              ),
                            ),
                            onTap: () {
                              Navigator.of(context).pop();
                              context.go(item.path);
                            },
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class NavDock extends StatelessWidget {
  const NavDock({required this.activePath, super.key});

  final String activePath;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: veil(AppColors.surface, .66),
        border: Border.all(color: veil(AppColors.ink, .1)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final item in navItems)
            InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: () => context.go(item.path),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: item.path == activePath
                      ? AppColors.accent
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  item.label,
                  style: appText(
                    fontSize: 12,
                    color: item.path == activePath
                        ? const Color(0xff071018)
                        : AppColors.ink,
                    weight: FontWeight.w900,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class HeroSection extends StatelessWidget {
  const HeroSection({required this.cms, required this.page, super.key});

  final CmsContent cms;
  final PageContent page;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 900;
    return Padding(
      padding: EdgeInsets.only(top: compact ? 42 : 70, bottom: 52),
      child: compact
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                HeroCopy(cms: cms, page: page),
                const SizedBox(height: 28),
                const DashboardPreview(),
              ],
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  flex: 11,
                  child: HeroCopy(cms: cms, page: page),
                ),
                const SizedBox(width: 34),
                const Expanded(flex: 9, child: DashboardPreview()),
              ],
            ),
    );
  }
}

class HeroCopy extends StatelessWidget {
  const HeroCopy({required this.cms, required this.page, super.key});

  final CmsContent cms;
  final PageContent page;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 700;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            SignalPill(label: page.kicker, strong: true),
            const SignalPill(label: 'CMS Ready'),
          ],
        ),
        SizedBox(height: compact ? 26 : 36),
        Text(
          cms.company.nameAr,
          style: displayText(fontSize: compact ? 40 : 72, height: 1.05),
        ),
        const SizedBox(height: 16),
        Text(
          page.body,
          style: appText(
            fontSize: compact ? 17 : 21,
            color: AppColors.muted,
            height: 1.75,
            weight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 30),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            const PrimaryAction(label: 'ابدأ شراكة منظمة'),
            SecondaryAction(
              label: cms.company.phone,
              icon: Icons.call_rounded,
              ltr: true,
            ),
          ],
        ),
        const SizedBox(height: 34),
        const MetricRow(),
      ],
    );
  }
}

class PageHero extends StatelessWidget {
  const PageHero({required this.page, super.key});

  final PageContent page;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 760;
    return Padding(
      padding: EdgeInsets.only(
        top: compact ? 44 : 68,
        bottom: compact ? 32 : 46,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SignalPill(label: page.kicker, strong: true),
          const SizedBox(height: 20),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 860),
            child: Text(
              page.title,
              style: displayText(fontSize: compact ? 38 : 62, height: 1.08),
            ),
          ),
          const SizedBox(height: 16),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 780),
            child: Text(
              page.body,
              style: appText(
                fontSize: compact ? 16 : 20,
                color: AppColors.muted,
                height: 1.75,
                weight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({required this.page, super.key});

  final PageContent page;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 760;
    return Padding(
      padding: EdgeInsets.only(top: compact ? 46 : 64, bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SignalPill(label: page.kicker),
          const SizedBox(height: 14),
          Text(
            page.title,
            style: displayText(fontSize: compact ? 30 : 46, height: 1.16),
          ),
          const SizedBox(height: 10),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: Text(
              page.body,
              style: appText(
                fontSize: 16,
                color: AppColors.muted,
                height: 1.7,
                weight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ResponsiveCards extends StatelessWidget {
  const ResponsiveCards({
    required this.items,
    required this.featuredCount,
    super.key,
  });

  final List<CmsItem> items;
  final int featuredCount;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 1060
            ? 3
            : constraints.maxWidth >= 680
            ? 2
            : 1;
        const gap = 14.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (var i = 0; i < items.take(featuredCount).length; i++)
              SizedBox(
                width: width,
                child: FeatureCard(item: items[i], index: i + 1),
              ),
          ],
        );
      },
    );
  }
}

class FeatureCard extends StatelessWidget {
  const FeatureCard({required this.item, required this.index, super.key});

  final CmsItem item;
  final int index;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      constraints: const BoxConstraints(minHeight: 260),
      padding: const EdgeInsets.all(20),
      decoration: panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconBox(icon: item.icon, alt: index.isEven),
              const Spacer(),
              Text(
                index.toString().padLeft(2, '0'),
                textDirection: TextDirection.ltr,
                style: displayText(
                  fontSize: 28,
                  color: veil(AppColors.ink, .24),
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Text(
            item.titleAr,
            style: appText(
              fontSize: 20,
              color: AppColors.ink,
              weight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.description,
            style: appText(
              fontSize: 14,
              color: AppColors.muted,
              height: 1.65,
              weight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Text(
                  item.titleEn,
                  textDirection: TextDirection.ltr,
                  style: appText(
                    fontSize: 12,
                    color: AppColors.accent,
                    weight: FontWeight.w900,
                  ),
                ),
              ),
              if (item.slug != null)
                const Icon(
                  Icons.arrow_back_rounded,
                  color: AppColors.accent,
                  size: 18,
                ),
            ],
          ),
        ],
      ),
    );
    if (item.slug == null) return content;
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: () => context.go('/services/${item.slug}'),
      child: content,
    );
  }
}

class ServiceDetailHero extends StatelessWidget {
  const ServiceDetailHero({required this.service, super.key});

  final CmsItem service;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 860;
    final copy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            SignalPill(label: 'تفاصيل الخدمة', strong: true),
            SignalPill(label: 'فيديو + فورم + ريڤيوز'),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          service.titleAr,
          style: displayText(fontSize: compact ? 42 : 66, height: 1.08),
        ),
        const SizedBox(height: 12),
        Text(
          service.description,
          style: appText(
            fontSize: compact ? 17 : 21,
            color: AppColors.muted,
            height: 1.75,
            weight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            RatingBadge(reviews: service.reviews),
            SecondaryAction(
              label: service.titleEn,
              icon: service.icon,
              ltr: true,
            ),
          ],
        ),
      ],
    );
    final card = Container(
      padding: const EdgeInsets.all(22),
      decoration: panelDecoration(
        borderColor: veil(AppColors.accent, .2),
        radius: 30,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBox(icon: service.icon),
          const SizedBox(height: 22),
          Text('مخرجات الخدمة', style: displayText(fontSize: 30)),
          const SizedBox(height: 14),
          for (final benefit in service.benefits)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.green,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      benefit,
                      style: appText(
                        color: AppColors.ink,
                        weight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
    return Padding(
      padding: EdgeInsets.only(
        top: compact ? 44 : 68,
        bottom: compact ? 24 : 36,
      ),
      child: compact
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [copy, const SizedBox(height: 22), card],
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(flex: 11, child: copy),
                const SizedBox(width: 28),
                Expanded(flex: 7, child: card),
              ],
            ),
    );
  }
}

class RatingBadge extends StatelessWidget {
  const RatingBadge({required this.reviews, super.key});

  final List<CmsReview> reviews;

  @override
  Widget build(BuildContext context) {
    final average = reviews.isEmpty
        ? 0
        : reviews.map((review) => review.rating).reduce((a, b) => a + b) /
              reviews.length;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: veil(AppColors.gold, .12),
        border: Border.all(color: veil(AppColors.gold, .22)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star_rounded, color: AppColors.gold, size: 20),
          const SizedBox(width: 8),
          Text(
            '${average.toStringAsFixed(1)} / 5',
            textDirection: TextDirection.ltr,
            style: appText(color: AppColors.ink, weight: FontWeight.w900),
          ),
          const SizedBox(width: 8),
          Text(
            '${reviews.length} مراجعات',
            style: appText(color: AppColors.muted, weight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class VideoPanel extends StatelessWidget {
  const VideoPanel({required this.service, super.key});

  final CmsItem service;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 800;
    final videoUrl = service.videoUrl?.trim();
    final embedUrl = youtubeEmbedUrlFrom(videoUrl);
    final children = [
      _VideoPreview(service: service, embedUrl: embedUrl, sourceUrl: videoUrl),
      const SizedBox(height: 18),
      _VideoCopy(service: service, hasEmbeddedVideo: embedUrl != null),
    ];
    return Container(
      padding: EdgeInsets.all(compact ? 18 : 24),
      decoration: panelDecoration(
        borderColor: veil(AppColors.accent, .18),
        radius: 28,
      ),
      child: compact
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(child: children[0]),
                const SizedBox(width: 24),
                Expanded(child: children[2]),
              ],
            ),
    );
  }
}

class _VideoPreview extends StatelessWidget {
  const _VideoPreview({
    required this.service,
    required this.embedUrl,
    required this.sourceUrl,
  });

  final CmsItem service;
  final String? embedUrl;
  final String? sourceUrl;

  @override
  Widget build(BuildContext context) {
    final embedded = embedUrl;
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: veil(AppColors.background, .48),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: veil(AppColors.ink, .12)),
        ),
        child: embedded == null
            ? Stack(
                children: [
                  const Positioned.fill(
                    child: CustomPaint(painter: VideoGridPainter()),
                  ),
                  Center(
                    child: Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        color: AppColors.accent,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Icon(
                        Icons.play_arrow_rounded,
                        color: Color(0xff071018),
                        size: 44,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 18,
                    bottom: 16,
                    child: Text(
                      sourceUrl == null || sourceUrl!.isEmpty
                          ? 'أضف رابط الفيديو من لوحة الأدمن'
                          : 'رابط غير قابل للعرض داخل الموقع',
                      style: appText(
                        color: AppColors.ink,
                        weight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              )
            : Stack(
                children: [
                  Positioned.fill(
                    child: ServiceVideoEmbed(
                      embedUrl: embedded,
                      title: 'فيديو ${service.titleAr}',
                    ),
                  ),
                  Positioned(
                    right: 14,
                    top: 14,
                    child: SignalPill(label: 'YouTube Embed', strong: true),
                  ),
                ],
              ),
      ),
    );
  }
}

class _VideoCopy extends StatelessWidget {
  const _VideoCopy({required this.service, required this.hasEmbeddedVideo});

  final CmsItem service;
  final bool hasEmbeddedVideo;

  @override
  Widget build(BuildContext context) {
    final videoUrl = service.videoUrl?.trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('فيديو الخدمة', style: displayText(fontSize: 34)),
        const SizedBox(height: 12),
        Text(
          hasEmbeddedVideo
              ? 'شاهد الفيديو التعريفي داخل الصفحة لفهم نطاق الخدمة، طريقة العمل، والنتيجة المتوقعة قبل إرسال الفورم.'
              : videoUrl == null || videoUrl.isEmpty
              ? 'أضف رابط YouTube من لوحة الأدمن ليظهر الفيديو هنا مباشرة داخل الموقع.'
              : 'الرابط الحالي متاح للفتح، لكنه ليس رابط YouTube قابل للعرض داخل الموقع.',
          style: appText(
            color: AppColors.muted,
            height: 1.7,
            weight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 18),
        SecondaryAction(
          label: videoUrl == null || videoUrl.isEmpty
              ? 'أضف الرابط من لوحة الأدمن'
              : videoUrl,
          icon: Icons.open_in_new_rounded,
          ltr: videoUrl != null && videoUrl.isNotEmpty,
        ),
      ],
    );
  }
}

class ServiceRequestForm extends ConsumerStatefulWidget {
  const ServiceRequestForm({
    required this.service,
    required this.labels,
    super.key,
  });

  final CmsItem service;
  final List<String> labels;

  @override
  ConsumerState<ServiceRequestForm> createState() => _ServiceRequestFormState();
}

class _ServiceRequestFormState extends ConsumerState<ServiceRequestForm> {
  late final TextEditingController nameController;
  late final TextEditingController phoneController;
  late final TextEditingController emailController;
  late final TextEditingController detailsController;
  late final TextEditingController serviceController;

  @override
  void initState() {
    super.initState();
    nameController = TextEditingController();
    phoneController = TextEditingController();
    emailController = TextEditingController();
    detailsController = TextEditingController();
    serviceController = TextEditingController(text: widget.service.titleAr);
  }

  @override
  void dispose() {
    nameController.dispose();
    phoneController.dispose();
    emailController.dispose();
    detailsController.dispose();
    serviceController.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    final request = ServiceRequest(
      serviceSlug: widget.service.slug ?? widget.service.titleEn,
      serviceTitle: widget.service.titleAr,
      name: nameController.text.trim(),
      phone: phoneController.text.trim(),
      email: emailController.text.trim(),
      details: detailsController.text.trim(),
      createdAtLabel: 'الآن',
    );
    await ref.read(cmsProvider.notifier).submitServiceRequest(request);
    if (!mounted) return;
    nameController.clear();
    phoneController.clear();
    emailController.clear();
    detailsController.clear();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'تم إرسال الطلب إلى لوحة الأدمن',
          style: appText(color: AppColors.ink, weight: FontWeight.w800),
        ),
        backgroundColor: AppColors.surfaceStrong,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 800;
    final fields = [
      RequestInput(
        key: const ValueKey('request-name'),
        label: widget.labels[0],
        controller: nameController,
      ),
      RequestInput(
        key: const ValueKey('request-phone'),
        label: widget.labels[1],
        controller: phoneController,
        ltr: true,
      ),
      RequestInput(
        key: const ValueKey('request-email'),
        label: widget.labels[2],
        controller: emailController,
        ltr: true,
      ),
      RequestInput(
        key: const ValueKey('request-service'),
        label: '${widget.labels[3]}: ${widget.service.titleAr}',
        controller: serviceController,
        enabled: false,
      ),
      RequestInput(
        key: const ValueKey('request-details'),
        label: widget.labels[4],
        controller: detailsController,
        tall: true,
      ),
      const SizedBox(height: 14),
      Align(
        alignment: Alignment.centerRight,
        child: FilledButton.icon(
          key: const ValueKey('submit-service-request'),
          onPressed: submit,
          icon: const Icon(Icons.arrow_back_rounded),
          label: const Text('إرسال طلب الخدمة'),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.accent,
            foregroundColor: const Color(0xff071018),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
            textStyle: appText(fontSize: 15, weight: FontWeight.w900),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ),
      ),
    ];
    return Container(
      padding: EdgeInsets.all(compact ? 18 : 24),
      decoration: panelDecoration(
        borderColor: veil(AppColors.gold, .18),
        radius: 28,
      ),
      child: compact
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: fields,
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Column(children: fields.take(3).toList())),
                const SizedBox(width: 16),
                Expanded(child: Column(children: fields.skip(3).toList())),
              ],
            ),
    );
  }
}

class RequestInput extends StatelessWidget {
  const RequestInput({
    required this.label,
    required this.controller,
    this.tall = false,
    this.ltr = false,
    this.enabled = true,
    this.obscure = false,
    super.key,
  });

  final String label;
  final TextEditingController controller;
  final bool tall;
  final bool ltr;
  final bool enabled;
  final bool obscure;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        enabled: enabled,
        obscureText: obscure,
        maxLines: tall ? 4 : 1,
        textInputAction: tall ? TextInputAction.newline : TextInputAction.next,
        keyboardType: tall
            ? TextInputType.multiline
            : ltr
            ? TextInputType.emailAddress
            : TextInputType.text,
        textDirection: ltr ? TextDirection.ltr : TextDirection.rtl,
        style: appText(color: AppColors.ink, weight: FontWeight.w800),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: appText(color: AppColors.muted, weight: FontWeight.w800),
          filled: true,
          fillColor: veil(AppColors.background, enabled ? .42 : .22),
          disabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: veil(AppColors.ink, .1)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: veil(AppColors.ink, .14)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
          ),
        ),
      ),
    );
  }
}

class ReviewsGrid extends StatelessWidget {
  const ReviewsGrid({required this.reviews, super.key});

  final List<CmsReview> reviews;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 860 ? 2 : 1;
        const gap = 14.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (final review in reviews)
              SizedBox(
                width: width,
                child: ReviewCard(review: review),
              ),
          ],
        );
      },
    );
  }
}

class ReviewCard extends StatelessWidget {
  const ReviewCard({required this.review, super.key});

  final CmsReview review;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconBox(icon: Icons.person_rounded, small: true, alt: true),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  review.customer,
                  style: appText(
                    fontSize: 17,
                    color: AppColors.ink,
                    weight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                review.dateLabel,
                style: appText(
                  fontSize: 12,
                  color: AppColors.muted,
                  weight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              for (var i = 0; i < review.rating; i++)
                const Icon(Icons.star_rounded, color: AppColors.gold, size: 18),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            review.body,
            style: appText(
              color: AppColors.muted,
              height: 1.7,
              weight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class AdminModeBanner extends ConsumerWidget {
  const AdminModeBanner({required this.auth, super.key});

  final AdminAuthState auth;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sync = ref.watch(cmsSyncProvider);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: panelDecoration(
        borderColor: veil(AppColors.gold, .2),
        radius: 24,
      ),
      child: Row(
        children: [
          const Icon(Icons.admin_panel_settings_rounded, color: AppColors.gold),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              auth.isConfigured
                  ? 'Admin متصل بـ Supabase Auth. حالة البيانات: ${sync.label}'
                  : 'وضع تطوير محلي: أضف SUPABASE_URL و SUPABASE_ANON_KEY لتفعيل الحفظ الحقيقي والحماية.',
              style: appText(
                color: AppColors.ink,
                height: 1.6,
                weight: FontWeight.w800,
              ),
            ),
          ),
          if (sync.isBusy) ...[
            const SizedBox(width: 10),
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.accent,
              ),
            ),
          ],
          if (auth.isAuthenticated && auth.isConfigured) ...[
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: () => ref.read(adminAuthProvider.notifier).signOut(),
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text('خروج'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.ink,
                side: BorderSide(color: veil(AppColors.ink, .22)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class AdminLoginPanel extends ConsumerStatefulWidget {
  const AdminLoginPanel({super.key});

  @override
  ConsumerState<AdminLoginPanel> createState() => _AdminLoginPanelState();
}

class _AdminLoginPanelState extends ConsumerState<AdminLoginPanel> {
  late final TextEditingController emailController;
  late final TextEditingController passwordController;

  @override
  void initState() {
    super.initState();
    emailController = TextEditingController();
    passwordController = TextEditingController();
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    await ref
        .read(adminAuthProvider.notifier)
        .signIn(emailController.text.trim(), passwordController.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(adminAuthProvider);
    return AdminPanel(
      title: 'تسجيل دخول الأدمن',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          RequestInput(
            key: const ValueKey('admin-email'),
            label: 'بريد الأدمن',
            controller: emailController,
            ltr: true,
          ),
          RequestInput(
            key: const ValueKey('admin-password'),
            label: 'كلمة المرور',
            controller: passwordController,
            ltr: true,
            obscure: true,
          ),
          if (auth.error != null) ...[
            const SizedBox(height: 6),
            Text(
              auth.error!,
              style: appText(color: AppColors.danger, weight: FontWeight.w800),
            ),
          ],
          const SizedBox(height: 14),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              key: const ValueKey('admin-login-submit'),
              onPressed: auth.isLoading ? null : submit,
              icon: const Icon(Icons.lock_open_rounded),
              label: const Text('دخول لوحة الأدمن'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.accent,
                foregroundColor: const Color(0xff071018),
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 16,
                ),
                textStyle: appText(fontSize: 14, weight: FontWeight.w900),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AdminDashboard extends ConsumerStatefulWidget {
  const AdminDashboard({required this.cms, super.key});

  final CmsContent cms;

  @override
  ConsumerState<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends ConsumerState<AdminDashboard> {
  int tab = 0;

  final tabs = const [
    ('نظرة عامة', Icons.speed_rounded),
    ('الصفحات', Icons.article_rounded),
    ('الخدمات', Icons.account_tree_rounded),
    ('معلومات عامة', Icons.route_rounded),
    ('الفيديوهات', Icons.play_circle_rounded),
    ('الريڤيوز', Icons.reviews_rounded),
    ('طلبات العملاء', Icons.inbox_rounded),
    ('بيانات الشركة', Icons.apartment_rounded),
    ('الفورم', Icons.dynamic_form_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (var i = 0; i < tabs.length; i++)
              InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => setState(() => tab = i),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: tab == i
                        ? AppColors.accent
                        : veil(AppColors.surface, .68),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: veil(AppColors.ink, .1)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        tabs[i].$2,
                        size: 17,
                        color: tab == i
                            ? const Color(0xff071018)
                            : AppColors.muted,
                      ),
                      const SizedBox(width: 7),
                      Text(
                        tabs[i].$1,
                        style: appText(
                          fontSize: 12,
                          color: tab == i
                              ? const Color(0xff071018)
                              : AppColors.ink,
                          weight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 18),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: _tabBody(),
        ),
      ],
    );
  }

  Widget _tabBody() {
    final cms = widget.cms;
    return switch (tab) {
      0 => AdminOverview(cms: cms),
      1 => AdminPagesEditor(cms: cms),
      2 => AdminItemsEditor(
        collection: CmsCollection.serviceModels,
        title: 'الخدمات/النماذج',
        items: cms.serviceModels,
      ),
      3 => AdminItemsEditor(
        collection: CmsCollection.generalInfo,
        title: 'معلومات عامة',
        items: cms.generalInfo,
      ),
      4 => AdminVideosEditor(items: cms.serviceModels),
      5 => AdminReviewsEditor(items: cms.serviceModels),
      6 => AdminRequestsEditor(requests: cms.serviceRequests),
      7 => AdminCompanyEditor(company: cms.company),
      _ => AdminFormEditor(labels: cms.formLabels),
    };
  }
}

class AdminOverview extends StatelessWidget {
  const AdminOverview({required this.cms, super.key});

  final CmsContent cms;

  @override
  Widget build(BuildContext context) {
    final cards = [
      ('صفحات', '${cms.pages.length}', Icons.article_rounded),
      ('خدمات', '${cms.serviceModels.length}', Icons.account_tree_rounded),
      ('معلومات عامة', '${cms.generalInfo.length}', Icons.route_rounded),
      (
        'ريڤيوز',
        '${cms.serviceModels.fold<int>(0, (sum, item) => sum + item.reviews.length)}',
        Icons.star_rounded,
      ),
      ('طلبات', '${cms.serviceRequests.length}', Icons.inbox_rounded),
    ];
    return ResponsiveAdminGrid(
      children: [
        for (final card in cards)
          AdminPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconBox(icon: card.$3),
                const SizedBox(height: 16),
                Text(
                  card.$2,
                  style: displayText(fontSize: 36, color: AppColors.accent),
                ),
                Text(
                  card.$1,
                  style: appText(
                    color: AppColors.muted,
                    weight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class AdminPagesEditor extends ConsumerWidget {
  const AdminPagesEditor({required this.cms, super.key});

  final CmsContent cms;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        for (final entry in cms.pages.entries)
          AdminPanel(
            title: 'صفحة: ${entry.key}',
            child: Column(
              children: [
                CmsTextField(
                  label: 'العنوان',
                  initialValue: entry.value.title,
                  onSave: (value) => ref
                      .read(cmsProvider.notifier)
                      .updatePage(entry.key, title: value),
                ),
                CmsTextField(
                  label: 'الوصف',
                  initialValue: entry.value.body,
                  tall: true,
                  onSave: (value) => ref
                      .read(cmsProvider.notifier)
                      .updatePage(entry.key, body: value),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class AdminItemsEditor extends ConsumerWidget {
  const AdminItemsEditor({
    required this.collection,
    required this.title,
    required this.items,
    super.key,
  });

  final CmsCollection collection;
  final String title;
  final List<CmsItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        for (var i = 0; i < items.length; i++)
          AdminPanel(
            title: '$title: ${items[i].titleAr}',
            child: Column(
              children: [
                CmsTextField(
                  label: 'الاسم',
                  initialValue: items[i].titleAr,
                  onSave: (value) => ref
                      .read(cmsProvider.notifier)
                      .updateItem(
                        collection: collection,
                        index: i,
                        titleAr: value,
                      ),
                ),
                CmsTextField(
                  label: 'الوصف',
                  initialValue: items[i].description,
                  tall: true,
                  onSave: (value) => ref
                      .read(cmsProvider.notifier)
                      .updateItem(
                        collection: collection,
                        index: i,
                        description: value,
                      ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class AdminVideosEditor extends ConsumerWidget {
  const AdminVideosEditor({required this.items, super.key});

  final List<CmsItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        for (var i = 0; i < items.length; i++)
          AdminPanel(
            title: 'فيديو: ${items[i].titleAr}',
            child: CmsTextField(
              label: 'Video URL',
              initialValue: items[i].videoUrl ?? '',
              ltr: true,
              onSave: (value) => ref
                  .read(cmsProvider.notifier)
                  .updateItem(
                    collection: CmsCollection.serviceModels,
                    index: i,
                    videoUrl: value,
                  ),
            ),
          ),
      ],
    );
  }
}

class AdminReviewsEditor extends ConsumerWidget {
  const AdminReviewsEditor({required this.items, super.key});

  final List<CmsItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        for (final service in items)
          AdminPanel(
            title: 'إضافة ريفيو: ${service.titleAr}',
            child: NewReviewComposer(service: service),
          ),
        for (final service in items)
          for (var i = 0; i < service.reviews.length; i++)
            AdminPanel(
              title: 'Review: ${service.titleAr}',
              child: Column(
                children: [
                  CmsTextField(
                    label: 'اسم العميل',
                    initialValue: service.reviews[i].customer,
                    onSave: (value) => ref
                        .read(cmsProvider.notifier)
                        .updateReview(service.slug!, i, customer: value),
                  ),
                  CmsTextField(
                    label: 'نص الريڤيو',
                    initialValue: service.reviews[i].body,
                    tall: true,
                    onSave: (value) => ref
                        .read(cmsProvider.notifier)
                        .updateReview(service.slug!, i, body: value),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => ref
                          .read(cmsProvider.notifier)
                          .deleteReview(service.slug!, i),
                      icon: const Icon(Icons.delete_rounded, size: 18),
                      label: const Text('حذف الريفيو'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        textStyle: appText(
                          fontSize: 13,
                          weight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

class NewReviewComposer extends ConsumerStatefulWidget {
  const NewReviewComposer({required this.service, super.key});

  final CmsItem service;

  @override
  ConsumerState<NewReviewComposer> createState() => _NewReviewComposerState();
}

class _NewReviewComposerState extends ConsumerState<NewReviewComposer> {
  late final TextEditingController customerController;
  late final TextEditingController bodyController;

  @override
  void initState() {
    super.initState();
    customerController = TextEditingController();
    bodyController = TextEditingController();
  }

  @override
  void dispose() {
    customerController.dispose();
    bodyController.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    final customer = customerController.text.trim();
    final body = bodyController.text.trim();
    if (customer.isEmpty && body.isEmpty) return;
    await ref
        .read(cmsProvider.notifier)
        .addReview(
          widget.service.slug!,
          CmsReview(
            customer.isEmpty ? 'عميل وعاء' : customer,
            body.isEmpty ? 'تجربة ممتازة مع الخدمة.' : body,
            'من لوحة الأدمن',
            5,
          ),
        );
    customerController.clear();
    bodyController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        RequestInput(
          key: ValueKey('new-review-customer-${widget.service.slug}'),
          label: 'اسم صاحب الريفيو',
          controller: customerController,
        ),
        RequestInput(
          key: ValueKey('new-review-body-${widget.service.slug}'),
          label: 'نص الريفيو',
          controller: bodyController,
          tall: true,
        ),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            key: ValueKey('add-review-${widget.service.slug}'),
            onPressed: submit,
            icon: const Icon(Icons.add_rounded),
            label: const Text('إضافة الريفيو'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: const Color(0xff071018),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              textStyle: appText(fontSize: 13, weight: FontWeight.w900),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class AdminRequestsEditor extends ConsumerWidget {
  const AdminRequestsEditor({required this.requests, super.key});

  final List<ServiceRequest> requests;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (requests.isEmpty) {
      return AdminPanel(
        title: 'طلبات العملاء',
        child: Text(
          'لا توجد طلبات حتى الآن. أي فورم خدمة يتم إرساله سيظهر هنا مباشرة داخل نفس الجلسة.',
          style: appText(color: AppColors.muted, height: 1.7),
        ),
      );
    }
    return Column(
      children: [
        for (final request in requests)
          AdminPanel(
            title: '${request.status}: ${request.serviceTitle}',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    SignalPill(label: request.createdAtLabel, strong: true),
                    SignalPill(label: request.phone),
                    SignalPill(label: request.email),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  request.name,
                  style: displayText(fontSize: 24, color: AppColors.ink),
                ),
                const SizedBox(height: 8),
                Text(
                  request.details.isEmpty
                      ? 'لا توجد تفاصيل إضافية.'
                      : request.details,
                  style: appText(color: AppColors.muted, height: 1.7),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    for (final status in const [
                      'طلب جديد',
                      'قيد المتابعة',
                      'تم التواصل',
                    ])
                      ChoiceChip(
                        selected: request.status == status,
                        label: Text(status),
                        onSelected: (_) => ref
                            .read(cmsProvider.notifier)
                            .updateServiceRequestStatus(request.id, status),
                        selectedColor: AppColors.accent,
                        backgroundColor: veil(AppColors.surfaceStrong, .72),
                        labelStyle: appText(
                          fontSize: 12,
                          color: request.status == status
                              ? const Color(0xff071018)
                              : AppColors.ink,
                          weight: FontWeight.w900,
                        ),
                        side: BorderSide(color: veil(AppColors.ink, .12)),
                      ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class AdminCompanyEditor extends ConsumerWidget {
  const AdminCompanyEditor({required this.company, super.key});

  final CompanyContent company;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(cmsProvider.notifier);
    return AdminPanel(
      title: 'بيانات الشركة',
      child: Column(
        children: [
          CmsTextField(
            label: 'اسم الشركة',
            initialValue: company.nameAr,
            onSave: (value) => controller.updateCompany(nameAr: value),
          ),
          CmsTextField(
            label: 'التاجلاين',
            initialValue: company.taglineAr,
            onSave: (value) => controller.updateCompany(taglineAr: value),
          ),
          CmsTextField(
            label: 'الهاتف',
            initialValue: company.phone,
            ltr: true,
            onSave: (value) => controller.updateCompany(phone: value),
          ),
          CmsTextField(
            label: 'البريد',
            initialValue: company.email,
            ltr: true,
            onSave: (value) => controller.updateCompany(email: value),
          ),
          CmsTextField(
            label: 'العنوان',
            initialValue: company.headquarters,
            onSave: (value) => controller.updateCompany(headquarters: value),
          ),
          CmsTextField(
            label: 'الرؤية',
            initialValue: company.vision,
            tall: true,
            onSave: (value) => controller.updateCompany(vision: value),
          ),
          CmsTextField(
            label: 'الرسالة',
            initialValue: company.mission,
            tall: true,
            onSave: (value) => controller.updateCompany(mission: value),
          ),
        ],
      ),
    );
  }
}

class AdminFormEditor extends ConsumerWidget {
  const AdminFormEditor({required this.labels, super.key});

  final List<String> labels;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AdminPanel(
      title: 'إعدادات الفورم',
      child: Column(
        children: [
          for (var i = 0; i < labels.length; i++)
            CmsTextField(
              label: 'Field ${i + 1}',
              initialValue: labels[i],
              onSave: (value) =>
                  ref.read(cmsProvider.notifier).updateFormLabel(i, value),
            ),
        ],
      ),
    );
  }
}

class CmsTextField extends StatefulWidget {
  const CmsTextField({
    required this.label,
    required this.initialValue,
    required this.onSave,
    this.tall = false,
    this.ltr = false,
    super.key,
  });

  final String label;
  final String initialValue;
  final Future<void> Function(String value) onSave;
  final bool tall;
  final bool ltr;

  @override
  State<CmsTextField> createState() => _CmsTextFieldState();
}

class _CmsTextFieldState extends State<CmsTextField> {
  late final TextEditingController controller;
  bool isDirty = false;
  bool isSaving = false;
  String statusLabel = 'محفوظ';

  @override
  void initState() {
    super.initState();
    controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void didUpdateWidget(covariant CmsTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialValue != widget.initialValue &&
        controller.text != widget.initialValue) {
      controller.text = widget.initialValue;
      isDirty = false;
      statusLabel = 'محفوظ';
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: ValueKey('cms-field-${widget.label}'),
            controller: controller,
            maxLines: widget.tall ? 4 : 1,
            textDirection: widget.ltr ? TextDirection.ltr : TextDirection.rtl,
            style: appText(color: AppColors.ink, weight: FontWeight.w700),
            onChanged: (value) {
              final dirty = value != widget.initialValue;
              if (dirty != isDirty || statusLabel == 'تم الحفظ') {
                setState(() {
                  isDirty = dirty;
                  statusLabel = dirty ? 'تعديلات غير محفوظة' : 'محفوظ';
                });
              }
            },
            decoration: InputDecoration(
              labelText: widget.label,
              labelStyle: appText(
                color: AppColors.muted,
                weight: FontWeight.w700,
              ),
              filled: true,
              fillColor: veil(AppColors.background, .34),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: veil(AppColors.ink, .12)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.accent),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 10,
            children: [
              SignalPill(label: statusLabel, strong: isDirty),
              FilledButton.icon(
                key: ValueKey('cms-save-${widget.label}'),
                onPressed: !isDirty || isSaving
                    ? null
                    : () async {
                        setState(() {
                          isSaving = true;
                          statusLabel = 'جاري الحفظ...';
                        });
                        try {
                          await widget.onSave(controller.text.trim());
                          if (!mounted) return;
                          setState(() {
                            isDirty = false;
                            statusLabel = 'تم الحفظ';
                          });
                        } catch (_) {
                          if (!mounted) return;
                          setState(() {
                            statusLabel = 'تعذر الحفظ';
                          });
                        } finally {
                          if (mounted) {
                            setState(() => isSaving = false);
                          }
                        }
                      },
                icon: isSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xff071018),
                        ),
                      )
                    : const Icon(Icons.save_rounded, size: 18),
                label: Text(isSaving ? 'جاري الحفظ' : 'حفظ'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.accent,
                  foregroundColor: const Color(0xff071018),
                  disabledBackgroundColor: veil(AppColors.ink, .08),
                  disabledForegroundColor: veil(AppColors.ink, .42),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
                  textStyle: appText(fontSize: 13, weight: FontWeight.w900),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ResponsiveAdminGrid extends StatelessWidget {
  const ResponsiveAdminGrid({required this.children, super.key});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 900
            ? 4
            : constraints.maxWidth >= 560
            ? 2
            : 1;
        const gap = 14.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (final child in children) SizedBox(width: width, child: child),
          ],
        );
      },
    );
  }
}

class AdminPanel extends StatelessWidget {
  const AdminPanel({required this.child, this.title, super.key});

  final String? title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: panelDecoration(
        borderColor: veil(AppColors.accent, .14),
        radius: 24,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) ...[
            Text(
              title!,
              style: appText(
                fontSize: 18,
                color: AppColors.ink,
                weight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 14),
          ],
          child,
        ],
      ),
    );
  }
}

class FrameworkStrip extends StatelessWidget {
  const FrameworkStrip({required this.items, super.key});

  final List<CmsItem> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: panelDecoration(borderColor: veil(AppColors.gold, .18)),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i == items.length - 1 ? 0 : 12),
              child: Row(
                children: [
                  IconBox(icon: items[i].icon, alt: i.isOdd),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          items[i].titleAr,
                          style: appText(
                            fontSize: 18,
                            color: AppColors.ink,
                            weight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          items[i].description,
                          style: appText(
                            fontSize: 13,
                            color: AppColors.muted,
                            height: 1.6,
                            weight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class DashboardPreview extends StatelessWidget {
  const DashboardPreview({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 520),
      padding: const EdgeInsets.all(22),
      decoration:
          panelDecoration(
            borderColor: veil(AppColors.accent, .2),
            radius: 30,
          ).copyWith(
            boxShadow: [
              BoxShadow(
                color: veil(Colors.black, .34),
                blurRadius: 58,
                offset: const Offset(0, 28),
              ),
            ],
          ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PanelHeader(),
          SizedBox(height: 22),
          DashboardSparkRow(),
          SizedBox(height: 12),
          ExpandedLikeChart(),
          SizedBox(height: 14),
          PreviewRail(),
        ],
      ),
    );
  }
}

class DashboardSparkRow extends StatelessWidget {
  const DashboardSparkRow({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final narrow = constraints.maxWidth < 420;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
              width: narrow
                  ? constraints.maxWidth
                  : (constraints.maxWidth - 12) / 2,
              child: const SparkCard(
                title: 'الطلبات',
                value: '1,284',
                icon: Icons.shopping_bag_rounded,
              ),
            ),
            SizedBox(
              width: narrow
                  ? constraints.maxWidth
                  : (constraints.maxWidth - 12) / 2,
              child: const SparkCard(
                title: 'الفواتير',
                value: 'SAR 4.8M',
                icon: Icons.receipt_long_rounded,
              ),
            ),
          ],
        );
      },
    );
  }
}

class ExpandedLikeChart extends StatelessWidget {
  const ExpandedLikeChart({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 190,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: veil(AppColors.surfaceStrong, .78),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: veil(AppColors.accent, .16)),
      ),
      child: CustomPaint(
        painter: LineChartPainter(),
        child: Align(
          alignment: Alignment.topRight,
          child: Text(
            'حركة تشغيلية مباشرة',
            style: appText(color: AppColors.ink, weight: FontWeight.w900),
          ),
        ),
      ),
    );
  }
}

class SparkCard extends StatelessWidget {
  const SparkCard({
    required this.title,
    required this.value,
    required this.icon,
    super.key,
  });

  final String title;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 138,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: veil(AppColors.surfaceStrong, .78),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: veil(AppColors.ink, .1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: AppColors.gold, size: 24),
          Text(
            value,
            textDirection: TextDirection.ltr,
            style: displayText(fontSize: 28, color: AppColors.accent),
          ),
          Text(
            title,
            style: appText(
              fontSize: 13,
              color: AppColors.muted,
              weight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class OperationsMatrix extends StatelessWidget {
  const OperationsMatrix({super.key});

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('الحجوزات', 'قيد التصميم', AppColors.accent),
      ('المدفوعات', 'Stripe لاحقًا', AppColors.gold),
      ('الرسائل', 'Supabase لاحقًا', AppColors.green),
      ('الصلاحيات', 'RBAC لاحقًا', AppColors.danger),
    ];
    return Padding(
      padding: const EdgeInsets.only(top: 28),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: panelDecoration(),
        child: Column(
          children: [
            for (final row in rows)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: row.$3,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        row.$1,
                        style: appText(
                          color: AppColors.ink,
                          weight: FontWeight.w900,
                        ),
                      ),
                    ),
                    Text(
                      row.$2,
                      style: appText(
                        color: AppColors.muted,
                        weight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class TrustPanel extends StatelessWidget {
  const TrustPanel({required this.company, super.key});

  final CompanyContent company;

  @override
  Widget build(BuildContext context) {
    final data = [
      ('المقر الرئيسي', company.headquarters, Icons.location_on_rounded, false),
      ('السجل التجاري', company.cr, Icons.verified_rounded, true),
      ('الرقم الضريبي', company.vat, Icons.receipt_long_rounded, true),
      ('الهاتف', company.phone, Icons.call_rounded, true),
      ('البريد', company.email, Icons.mail_rounded, true),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 980
            ? 5
            : constraints.maxWidth >= 620
            ? 2
            : 1;
        const gap = 12.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: panelDecoration(
            borderColor: veil(AppColors.accent, .18),
            radius: 28,
          ),
          child: Wrap(
            spacing: gap,
            runSpacing: gap,
            children: [
              for (final item in data)
                SizedBox(
                  width: width,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(item.$3, color: AppColors.gold, size: 22),
                      const SizedBox(height: 12),
                      Text(
                        item.$1,
                        style: appText(
                          fontSize: 12,
                          color: AppColors.muted,
                          weight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.$2,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        textDirection: item.$4
                            ? TextDirection.ltr
                            : TextDirection.rtl,
                        style: appText(
                          fontSize: 14,
                          color: AppColors.ink,
                          height: 1.45,
                          weight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class VisionMissionPanel extends StatelessWidget {
  const VisionMissionPanel({required this.company, super.key});

  final CompanyContent company;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final narrow = constraints.maxWidth < 760;
        final cardWidth = narrow
            ? constraints.maxWidth
            : (constraints.maxWidth - 14) / 2;
        return Wrap(
          spacing: 14,
          runSpacing: 14,
          children: [
            SizedBox(
              width: cardWidth,
              child: StatementCard(
                title: 'الرؤية',
                body: company.vision,
                icon: Icons.visibility_rounded,
              ),
            ),
            SizedBox(
              width: cardWidth,
              child: StatementCard(
                title: 'الرسالة',
                body: company.mission,
                icon: Icons.flag_rounded,
              ),
            ),
          ],
        );
      },
    );
  }
}

class StatementCard extends StatelessWidget {
  const StatementCard({
    required this.title,
    required this.body,
    required this.icon,
    super.key,
  });

  final String title;
  final String body;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 240),
      padding: const EdgeInsets.all(22),
      decoration: panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBox(icon: icon),
          const SizedBox(height: 22),
          Text(title, style: displayText(fontSize: 30)),
          const SizedBox(height: 12),
          Text(
            body,
            style: appText(
              color: AppColors.muted,
              height: 1.75,
              weight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class ValuesBand extends StatelessWidget {
  const ValuesBand({required this.values, super.key});

  final List<String> values;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 28),
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (final value in values)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: veil(AppColors.gold, .12),
                border: Border.all(color: veil(AppColors.gold, .2)),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                value,
                style: appText(color: AppColors.ink, weight: FontWeight.w900),
              ),
            ),
        ],
      ),
    );
  }
}

class ContactPanel extends StatelessWidget {
  const ContactPanel({required this.company, required this.labels, super.key});

  final CompanyContent company;
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 760;
    return Container(
      padding: EdgeInsets.all(compact ? 20 : 28),
      decoration: panelDecoration(
        borderColor: veil(AppColors.accent, .18),
        radius: 28,
      ),
      child: compact
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ContactMethods(company: company),
                const SizedBox(height: 24),
                ContactFormPreview(labels: labels),
              ],
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: ContactMethods(company: company)),
                const SizedBox(width: 24),
                Expanded(child: ContactFormPreview(labels: labels)),
              ],
            ),
    );
  }
}

class ContactMethods extends StatelessWidget {
  const ContactMethods({required this.company, super.key});

  final CompanyContent company;

  @override
  Widget build(BuildContext context) {
    final methods = [
      (Icons.call_rounded, 'الهاتف', company.phone, true),
      (Icons.mail_rounded, 'البريد', company.email, true),
      (Icons.location_on_rounded, 'العنوان', company.headquarters, false),
      (Icons.language_rounded, 'الموقع', company.website, true),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('القنوات الرسمية', style: displayText(fontSize: 34)),
        const SizedBox(height: 18),
        for (final method in methods)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Row(
              children: [
                IconBox(icon: method.$1, small: true),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        method.$2,
                        style: appText(
                          fontSize: 12,
                          color: AppColors.muted,
                          weight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        method.$3,
                        textDirection: method.$4
                            ? TextDirection.ltr
                            : TextDirection.rtl,
                        style: appText(
                          color: AppColors.ink,
                          weight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class ContactFormPreview extends StatelessWidget {
  const ContactFormPreview({required this.labels, super.key});

  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < labels.length; i++)
          FauxInput(label: labels[i], tall: i == labels.length - 1),
        const SizedBox(height: 14),
        const PrimaryAction(label: 'إرسال الطلب لاحقًا'),
      ],
    );
  }
}

class FauxInput extends StatelessWidget {
  const FauxInput({required this.label, this.tall = false, super.key});

  final String label;
  final bool tall;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: tall ? 112 : 54,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      alignment: Alignment.topRight,
      decoration: BoxDecoration(
        color: veil(AppColors.background, .46),
        border: Border.all(color: veil(AppColors.ink, .12)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        label,
        style: appText(color: AppColors.muted, weight: FontWeight.w700),
      ),
    );
  }
}

class FinalCta extends StatelessWidget {
  const FinalCta({required this.company, super.key});

  final CompanyContent company;

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).width < 760;
    return Padding(
      padding: const EdgeInsets.only(top: 56),
      child: Container(
        padding: EdgeInsets.all(compact ? 22 : 34),
        decoration: BoxDecoration(
          color: veil(AppColors.accent, .12),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: veil(AppColors.accent, .22)),
        ),
        child: compact
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CtaCopy(company: company),
                  const SizedBox(height: 22),
                  const PrimaryAction(label: 'ابدأ الآن'),
                ],
              )
            : Row(
                children: [
                  Expanded(child: CtaCopy(company: company)),
                  const SizedBox(width: 24),
                  const PrimaryAction(label: 'ابدأ الآن'),
                ],
              ),
      ),
    );
  }
}

class CtaCopy extends StatelessWidget {
  const CtaCopy({required this.company, super.key});

  final CompanyContent company;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'جاهزون لتحويل النموذج إلى تشغيل؟',
          style: displayText(fontSize: 30, height: 1.2),
        ),
        const SizedBox(height: 10),
        Text(
          'تواصل معنا عبر ${company.email} وسيقوم فريق وعاء بمتابعة طلبك.',
          style: appText(
            color: AppColors.muted,
            height: 1.7,
            weight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class MetricRow extends StatelessWidget {
  const MetricRow({super.key});

  @override
  Widget build(BuildContext context) {
    final metrics = [
      ('05', 'قطاعات عامة'),
      ('03', 'خدمات'),
      ('CMS', 'قابل للتعديل'),
    ];
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: [
        for (final metric in metrics)
          Container(
            width: 138,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: veil(AppColors.surface, .58),
              border: Border.all(color: veil(AppColors.ink, .12)),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  metric.$1,
                  textDirection: TextDirection.ltr,
                  style: displayText(fontSize: 27, color: AppColors.accent),
                ),
                Text(
                  metric.$2,
                  style: appText(
                    fontSize: 12,
                    color: AppColors.muted,
                    weight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class PreviewRail extends ConsumerWidget {
  const PreviewRail({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cmsProvider).generalInfo.take(3).toList();
    return LayoutBuilder(
      builder: (context, constraints) {
        final tight = constraints.maxWidth < 430;
        return Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final item in items)
              Container(
                width: tight
                    ? constraints.maxWidth
                    : (constraints.maxWidth - 20) / 3,
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  color: veil(AppColors.background, .32),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: veil(AppColors.ink, .12)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(item.icon, color: AppColors.accent, size: 21),
                    const SizedBox(height: 12),
                    Text(
                      item.titleAr,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: appText(
                        fontSize: 13,
                        color: AppColors.ink,
                        weight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      item.titleEn,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textDirection: TextDirection.ltr,
                      style: appText(
                        fontSize: 10,
                        color: AppColors.muted,
                        weight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class PanelHeader extends ConsumerWidget {
  const PanelHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final company = ref.watch(cmsProvider).company;
    return Row(
      children: [
        const LogoMark(large: true),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                company.taglineAr,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: appText(color: AppColors.ink, weight: FontWeight.w900),
              ),
              Text(
                company.headquarters,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: appText(
                  fontSize: 12,
                  color: AppColors.muted,
                  weight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class SignalPill extends StatelessWidget {
  const SignalPill({required this.label, this.strong = false, super.key});

  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: strong ? AppColors.accent : veil(AppColors.surface, .58),
        border: Border.all(
          color: veil(strong ? AppColors.accent : AppColors.ink, .18),
        ),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: appText(
          fontSize: 12,
          color: strong ? const Color(0xff071018) : AppColors.ink,
          weight: FontWeight.w900,
        ),
      ),
    );
  }
}

class PrimaryAction extends StatelessWidget {
  const PrimaryAction({required this.label, super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: () {},
      icon: const Icon(Icons.arrow_back_rounded),
      label: Text(label),
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: const Color(0xff071018),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        textStyle: appText(fontSize: 15, weight: FontWeight.w900),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
    );
  }
}

class SecondaryAction extends StatelessWidget {
  const SecondaryAction({
    required this.label,
    required this.icon,
    this.ltr = false,
    super.key,
  });

  final String label;
  final IconData icon;
  final bool ltr;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () {},
      icon: Icon(icon, size: 18),
      label: Text(
        label,
        textDirection: ltr ? TextDirection.ltr : TextDirection.rtl,
      ),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        side: BorderSide(color: veil(AppColors.ink, .24)),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 17),
        textStyle: appText(fontSize: 14, weight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
    );
  }
}

class IconBox extends StatelessWidget {
  const IconBox({
    required this.icon,
    this.alt = false,
    this.small = false,
    super.key,
  });

  final IconData icon;
  final bool alt;
  final bool small;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: small ? 38 : 48,
      height: small ? 38 : 48,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: veil(alt ? AppColors.gold : AppColors.accent, .16),
        borderRadius: BorderRadius.circular(small ? 12 : 15),
      ),
      child: Icon(
        icon,
        color: alt ? AppColors.gold : AppColors.accent,
        size: small ? 20 : 24,
      ),
    );
  }
}

class LogoMark extends StatelessWidget {
  const LogoMark({this.large = false, super.key});

  final bool large;

  @override
  Widget build(BuildContext context) {
    final width = large ? 112.0 : 86.0;
    final height = large ? 74.0 : 56.0;
    return Container(
      width: width,
      height: height,
      alignment: Alignment.center,
      padding: EdgeInsets.all(large ? 7 : 5),
      decoration: BoxDecoration(
        color: Colors.black,
        border: Border.all(color: veil(AppColors.gold, .32)),
        borderRadius: BorderRadius.circular(large ? 18 : 15),
        boxShadow: [
          BoxShadow(
            color: veil(AppColors.gold, .22),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(large ? 13 : 11),
        child: Image.asset(
          'assets/brand/weaa-logo.jpeg',
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
        ),
      ),
    );
  }
}

class Footer extends StatelessWidget {
  const Footer({required this.company, super.key});

  final CompanyContent company;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 44, 16, 28),
      child: Text(
        '${company.nameEn} • ${company.email}',
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.center,
        style: appText(
          fontSize: 12,
          color: veil(AppColors.muted, .78),
          weight: FontWeight.w700,
        ),
      ),
    );
  }
}

class AppAtmosphere extends StatelessWidget {
  const AppAtmosphere({super.key});

  @override
  Widget build(BuildContext context) =>
      CustomPaint(painter: AtmospherePainter());
}

class AtmospherePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.background);
    final line = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = veil(AppColors.ink, .055);
    for (var x = 0.0; x < size.width; x += 42) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), line);
    }
    for (var y = 0.0; y < size.height; y += 42) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), line);
    }
    canvas.drawCircle(
      Offset(size.width * .18, size.height * .22),
      260,
      Paint()..color = veil(AppColors.accent, .09),
    );
    canvas.drawCircle(
      Offset(size.width * .88, size.height * .7),
      340,
      Paint()..color = veil(AppColors.gold, .06),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class LineChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = veil(AppColors.ink, .07)
      ..strokeWidth = 1;
    for (var y = 30.0; y < size.height; y += 36) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    final points = [0.72, 0.48, 0.58, 0.28, 0.36, 0.18, 0.31];
    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final point = Offset(
        size.width * i / (points.length - 1),
        size.height * points[i],
      );
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = AppColors.accent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class VideoGridPainter extends CustomPainter {
  const VideoGridPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = veil(AppColors.ink, .07)
      ..strokeWidth = 1;
    for (var x = 0.0; x < size.width; x += 34) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), line);
    }
    for (var y = 0.0; y < size.height; y += 34) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), line);
    }
    canvas.drawCircle(
      Offset(size.width * .22, size.height * .26),
      90,
      Paint()..color = veil(AppColors.accent, .12),
    );
    canvas.drawCircle(
      Offset(size.width * .82, size.height * .76),
      120,
      Paint()..color = veil(AppColors.gold, .09),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

BoxDecoration panelDecoration({Color? borderColor, double radius = 22}) {
  return BoxDecoration(
    color: veil(AppColors.surface, .68),
    border: Border.all(color: borderColor ?? veil(AppColors.ink, .12)),
    borderRadius: BorderRadius.circular(radius),
  );
}

TextStyle appText({
  double fontSize = 14,
  Color color = AppColors.ink,
  FontWeight weight = FontWeight.w600,
  double height = 1.35,
}) {
  return GoogleFonts.getFont(
    'Tajawal',
    fontSize: fontSize,
    color: color,
    fontWeight: weight,
    height: height,
  );
}

TextStyle displayText({
  double fontSize = 42,
  Color color = AppColors.ink,
  FontWeight weight = FontWeight.w900,
  double height = 1.1,
}) {
  return GoogleFonts.getFont(
    'Cairo',
    fontSize: fontSize,
    color: color,
    fontWeight: weight,
    height: height,
  );
}

Color veil(Color color, double opacity) =>
    color.withValues(alpha: opacity.clamp(0, 1));
