import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:weaa/main.dart';

void main() {
  testWidgets(
    'mobile courier submission shows code and preserves values on failure',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var calls = 0;
      final client = MockClient((request) async {
        calls++;
        return calls == 1
            ? http.Response(
                '{"success":false,"message":"الخدمة مشغولة"}',
                503,
                headers: {'content-type': 'application/json; charset=utf-8'},
              )
            : http.Response(
                '{"success":true,"message":"تم الاستلام","application_code":"MND-000123"}',
                201,
                headers: {'content-type': 'application/json; charset=utf-8'},
              );
      });
      final container = ProviderContainer(
        overrides: [
          courierApiProvider.overrideWithValue(CourierApi(client: client)),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const WeaaApp(initialLocation: '/join-us/courier-external'),
        ),
      );
      await tester.pumpAndSettle();
      for (final entry in {
        'name': 'أحمد محمد',
        'phone': '+201012345678',
        'education': 'جامعي',
        'country': 'مصر',
        'age': '٢٩',
      }.entries) {
        final field = find.byKey(ValueKey('courier-${entry.key}'));
        await tester.ensureVisible(field);
        await tester.enterText(field, entry.value);
      }
      for (final entry in {
        'marital_status': 'أعزب',
        'has_license': 'لا',
      }.entries) {
        final select = find.byKey(ValueKey('courier-${entry.key}-null'));
        await tester.ensureVisible(select);
        await tester.drag(
          find.byType(SingleChildScrollView).first,
          const Offset(0, 180),
        );
        await tester.pumpAndSettle();
        await tester.tap(select);
        await tester.pumpAndSettle();
        await tester.tap(find.text(entry.value).last);
        await tester.pumpAndSettle();
      }
      final submit = find.byKey(const ValueKey('submit-courier'));
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(find.text('الخدمة مشغولة'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'أحمد محمد'), findsOneWidget);
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(find.textContaining('MND-000123'), findsOneWidget);
      expect(container.read(cmsProvider).joinRequests, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  final values = {
    'name': 'أحمد محمد',
    'phone': '+201012345678',
    'marital_status': 'single',
    'education': 'تعليم جامعي',
    'has_license': '0',
    'country': 'مصر',
    'age': '29',
  };

  test('old CMS gains courier forms once and preserves deletion', () {
    final json = CmsContent.seed().toJson()..remove('courierFormsMigrated');
    json['joinForms'] = (json['joinForms'] as List)
        .where(
          (item) => !(item['submissionType'] as String).startsWith('courier-'),
        )
        .toList();
    final upgraded = CmsContent.fromJson(json);
    expect(
      upgraded.joinForms.where((f) => f.submissionType.startsWith('courier-')),
      hasLength(2),
    );
    final deleted = upgraded.copyWith(
      joinForms: upgraded.joinForms
          .where((f) => f.slug != 'courier-internal')
          .toList(),
    );
    expect(
      CmsContent.fromJson(
        deleted.toJson(),
      ).joinForms.any((f) => f.slug == 'courier-internal'),
      isFalse,
    );
  });

  test('courier validation accepts explicit no and rejects invalid fields', () {
    expect(courierDigits('٠١٢۳۴۵'), '012345');
    expect(validateCourierValues(false, values), isNull);
    expect(
      validateCourierValues(false, {...values, 'has_license': ''}),
      isNotNull,
    );
    expect(validateCourierValues(false, {...values, 'age': '1.5'}), isNotNull);
    expect(
      validateCourierValues(false, {...values, 'name': '<script>'}),
      isNotNull,
    );
    final internal = {
      'name': 'أحمد محمد',
      'phone': '0501234567',
      'nationality': 'مصري',
      'city': 'جدة',
      'profession': 'سائق',
      'license_type': 'light',
      'can_relocate': '0',
      'identity_expires_on': '2028-02-29',
    };
    expect(validateCourierValues(true, internal), isNull);
    expect(
      validateCourierValues(true, {
        ...internal,
        'identity_expires_on': '2027-02-29',
      }),
      isNotNull,
    );
    expect(
      validateCourierValues(true, {...internal, 'identity_number': '123'}),
      isNotNull,
    );
  });

  test('file validation checks signature, individual and total limits', () {
    PlatformFile pdf(int length) {
      final bytes = Uint8List(length)..setAll(0, '%PDF-'.codeUnits);
      return PlatformFile(name: 'document.pdf', size: length, bytes: bytes);
    }

    expect(validateCourierFiles([pdf(20)]), isNull);
    expect(validateCourierFiles([pdf(5 * 1024 * 1024 + 1)]), isNotNull);
    expect(validateCourierFiles(List.generate(11, (_) => pdf(20))), isNotNull);
    expect(
      validateCourierFiles(List.generate(5, (_) => pdf(5 * 1024 * 1024))),
      isNotNull,
    );
    expect(
      validateCourierFiles([
        PlatformFile(
          name: 'fake.pdf',
          size: 4,
          bytes: Uint8List.fromList([1, 2, 3, 4]),
        ),
      ]),
      isNotNull,
    );
  });

  test(
    'multipart contains explicit no and repeated named files with MIME',
    () async {
      final api = CourierApi(
        client: MockClient((request) async {
          expect(request.url.path, endsWith('/external'));
          expect(request.headers.containsKey('authorization'), isFalse);
          final body = request.body;
          expect(body, contains('name="has_license"\r\n\r\n0'));
          expect(
            RegExp('name="passport_files"').allMatches(body),
            hasLength(2),
          );
          expect(body, contains('content-type: application/pdf'));
          expect(body, isNot(contains('applicant_type')));
          return http.Response(
            '{"success":true,"message":"تم الاستلام","application_code":"MND-000123"}',
            201,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
      final file = PlatformFile(
        name: 'passport.pdf',
        size: 5,
        bytes: Uint8List.fromList('%PDF-'.codeUnits),
      );
      final result = await api.submit(false, values, {
        'passport_files': [file, file],
      });
      expect(result['application_code'], 'MND-000123');
    },
  );

  test('duplicate and server errors are shown without local saving', () async {
    final api = CourierApi(
      client: MockClient(
        (_) async => http.Response(
          '{"success":false,"message":"بيانات المتقدم مسجلة مسبقًا"}',
          409,
          headers: {'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    );
    await expectLater(
      api.submit(false, values, {}),
      throwsA(isA<StateError>()),
    );
  });

  testWidgets('courier card opens dedicated form without Supabase submission', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: WeaaApp(initialLocation: '/join-us/courier-external'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('courier-age')), findsOneWidget);
    expect(find.text('العودة إلى نماذج الانضمام'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('submit-courier')));
    await tester.tap(find.byKey(const ValueKey('submit-courier')));
    await tester.pump();
    expect(find.textContaining('أكمل الحقل'), findsOneWidget);
  });
}
