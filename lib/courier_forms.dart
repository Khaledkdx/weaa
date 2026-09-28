part of 'main.dart';

const courierChoices = {
  'license_type': {
    'private': 'خصوصي',
    'public': 'عمومي',
    'light': 'نقل خفيف',
    'heavy': 'نقل ثقيل',
    'motorcycle': 'دراجة نارية',
    'equipment': 'معدات / أشغال عامة',
    'none': 'لا توجد رخصة',
    'other': 'أخرى',
  },
  'marital_status': {
    'single': 'أعزب',
    'married': 'متزوج',
    'divorced': 'مطلق',
    'widowed': 'أرمل',
  },
  'can_relocate': {'1': 'نعم', '0': 'لا'},
  'has_license': {'1': 'نعم', '0': 'لا'},
};

const courierFormDefinitions = [
  CmsFormDefinition(
    slug: 'courier-internal',
    title: 'مناديب داخل المملكة',
    description: 'قدم بياناتك للانضمام إلى فريق المناديب داخل المملكة.',
    audience: 'مناديب داخل المملكة',
    kind: 'join',
    submissionType: 'courier-internal',
    enabled: true,
    fields: [
      CmsFormField(
        key: 'name',
        label: 'الاسم',
        type: CmsFormFieldType.text,
        required: true,
      ),
      CmsFormField(
        key: 'phone',
        label: 'رقم التواصل',
        type: CmsFormFieldType.phone,
        required: true,
      ),
      CmsFormField(
        key: 'nationality',
        label: 'الجنسية',
        type: CmsFormFieldType.text,
        required: true,
      ),
      CmsFormField(
        key: 'identity_number',
        label: 'رقم الهوية / الإقامة',
        type: CmsFormFieldType.text,
      ),
      CmsFormField(
        key: 'identity_expires_on',
        label: 'انتهاء الهوية (ميلادي)',
        type: CmsFormFieldType.date,
        required: true,
      ),
      CmsFormField(
        key: 'city',
        label: 'المدينة',
        type: CmsFormFieldType.text,
        required: true,
      ),
      CmsFormField(
        key: 'profession',
        label: 'المهنة في الإقامة',
        type: CmsFormFieldType.text,
        required: true,
      ),
      CmsFormField(
        key: 'license_type',
        label: 'نوع الرخصة',
        type: CmsFormFieldType.select,
        required: true,
      ),
      CmsFormField(
        key: 'can_relocate',
        label: 'قابلية الانتقال',
        type: CmsFormFieldType.select,
        required: true,
      ),
    ],
  ),
  CmsFormDefinition(
    slug: 'courier-external',
    title: 'مناديب خارج المملكة',
    description: 'قدم بياناتك للانضمام إلى فريق المناديب من خارج المملكة.',
    audience: 'مناديب خارج المملكة',
    kind: 'join',
    submissionType: 'courier-external',
    enabled: true,
    fields: [
      CmsFormField(
        key: 'name',
        label: 'الاسم',
        type: CmsFormFieldType.text,
        required: true,
      ),
      CmsFormField(
        key: 'phone',
        label: 'رقم الجوال مع رمز البلد',
        type: CmsFormFieldType.phone,
        required: true,
      ),
      CmsFormField(
        key: 'marital_status',
        label: 'الحالة الاجتماعية',
        type: CmsFormFieldType.select,
        required: true,
      ),
      CmsFormField(
        key: 'education',
        label: 'التعليم',
        type: CmsFormFieldType.text,
        required: true,
      ),
      CmsFormField(
        key: 'has_license',
        label: 'هل لديك رخصة؟',
        type: CmsFormFieldType.select,
        required: true,
      ),
      CmsFormField(
        key: 'country',
        label: 'البلد',
        type: CmsFormFieldType.text,
        required: true,
      ),
      CmsFormField(
        key: 'age',
        label: 'السن بالسنوات',
        type: CmsFormFieldType.number,
        required: true,
      ),
    ],
  ),
];

String courierDigits(String value) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return value.split('').map((c) {
    final index = arabic.indexOf(c);
    final other = persian.indexOf(c);
    return index >= 0
        ? '$index'
        : other >= 0
        ? '$other'
        : c;
  }).join();
}

Map<String, String> courierFileSections(bool internal) => {
  if (internal) 'identity_files': 'الهوية / الإقامة',
  if (internal) 'residency_files': 'مستندات الإقامة',
  if (!internal) 'passport_files': 'جواز السفر',
  'license_files': 'الرخصة',
  if (internal) 'registration_files': 'استمارة المركبة',
  'photo_files': 'الصورة الشخصية',
  'additional_files': 'مستندات إضافية',
};

String? validateCourierValues(bool internal, Map<String, String> values) {
  final definition = courierFormDefinitions[internal ? 0 : 1];
  final lengths = {
    'name': 160,
    'nationality': 80,
    'city': 100,
    'profession': 120,
    'education': 160,
    'country': 100,
  };
  for (final field in definition.fields) {
    final value = values[field.key] ?? '';
    if (field.required && value.isEmpty) return 'أكمل الحقل: ${field.label}';
    if (RegExp(r'[<>\x00-\x1f\x7f]').hasMatch(value)) {
      return 'قيمة غير صالحة: ${field.label}';
    }
    if (lengths.containsKey(field.key) &&
        (value.length < 2 || value.length > lengths[field.key]!)) {
      return '${field.label}: أدخل من حرفين إلى ${lengths[field.key]} حرفًا';
    }
    if (courierChoices.containsKey(field.key) &&
        !courierChoices[field.key]!.containsKey(value)) {
      return 'اختر ${field.label}';
    }
  }
  final phone = values['phone'] ?? '';
  final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
  if (!RegExp(r'^\+?[0-9 ()-]+$').hasMatch(phone) ||
      digits.length < 8 ||
      digits.length > 15) {
    return 'أدخل رقم تواصل صحيحًا من 8 إلى 15 رقمًا';
  }
  if (internal) {
    final identity = values['identity_number'] ?? '';
    if (identity.isNotEmpty && !RegExp(r'^\d{10}$').hasMatch(identity)) {
      return 'رقم الهوية يجب أن يتكون من 10 أرقام';
    }
    final date = values['identity_expires_on'] ?? '';
    final parsed = DateTime.tryParse(date);
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date) ||
        parsed == null ||
        parsed.year < 1900 ||
        parsed.year > 2200 ||
        parsed.toIso8601String().substring(0, 10) != date) {
      return 'أدخل تاريخًا ميلاديًا صحيحًا بصيغة سنة-شهر-يوم';
    }
  } else {
    final age = int.tryParse(values['age'] ?? '');
    if (age == null || age < 1 || age > 120) {
      return 'أدخل سنًا صحيحًا من 1 إلى 120';
    }
  }
  return null;
}

String? validateCourierFiles(Iterable<PlatformFile> files) {
  final list = files.toList();
  if (list.length > 10) return 'الحد الأقصى 10 ملفات';
  var total = 0;
  for (final file in list) {
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) return 'تعذر قراءة الملف: ${file.name}';
    if (bytes.length > 5 * 1024 * 1024) {
      return 'الحد الأقصى للملف 5 ميجابايت: ${file.name}';
    }
    final extension = file.name.split('.').last.toLowerCase();
    final pdf =
        bytes.length >= 5 && String.fromCharCodes(bytes.take(5)) == '%PDF-';
    final jpg =
        bytes.length >= 3 &&
        bytes[0] == 255 &&
        bytes[1] == 216 &&
        bytes[2] == 255;
    final png =
        bytes.length >= 8 &&
        bytes.take(8).join(',') == '137,80,78,71,13,10,26,10';
    if (!(extension == 'pdf' && pdf ||
        ['jpg', 'jpeg'].contains(extension) && jpg ||
        extension == 'png' && png)) {
      return 'ملف غير مدعوم: ${file.name}. اختر PDF أو JPEG أو PNG';
    }
    total += bytes.length;
  }
  return total > 20 * 1024 * 1024
      ? 'إجمالي المرفقات يجب ألا يتجاوز 20 ميجابايت'
      : null;
}

final courierApiProvider = Provider<CourierApi>((ref) {
  final api = CourierApi();
  ref.onDispose(api.client.close);
  return api;
});

class CourierApi {
  CourierApi({http.Client? client}) : client = client ?? http.Client();
  final http.Client client;

  Future<Map<String, dynamic>> submit(
    bool internal,
    Map<String, String> values,
    Map<String, List<PlatformFile>> files,
  ) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse(
        'https://app.swarsafqa.com/api/public/courier-applications/${internal ? 'internal' : 'external'}',
      ),
    );
    request.fields.addAll(values);
    for (final entry in files.entries) {
      for (final file in entry.value) {
        final extension = file.name.split('.').last.toLowerCase();
        final mime = extension == 'pdf'
            ? 'application/pdf'
            : extension == 'png'
            ? 'image/png'
            : 'image/jpeg';
        request.files.add(
          http.MultipartFile.fromBytes(
            entry.key,
            file.bytes!,
            filename: file.name,
            contentType: MediaType.parse(mime),
          ),
        );
      }
    }
    final response = await client
        .send(request)
        .timeout(const Duration(seconds: 70));
    final body = await response.stream.bytesToString().timeout(
      const Duration(seconds: 70),
    );
    Map<String, dynamic> result;
    try {
      result = Map<String, dynamic>.from(jsonDecode(body) as Map);
    } catch (_) {
      throw StateError('تعذر قراءة رد الخدمة. حاول لاحقًا');
    }
    if (response.statusCode != 201 || result['success'] != true) {
      throw StateError(
        result['message']?.toString() ??
            'تعذر إرسال الطلب (${response.statusCode})',
      );
    }
    return result;
  }
}

class CourierApplicationForm extends ConsumerStatefulWidget {
  const CourierApplicationForm({required this.form, super.key});
  final CmsFormDefinition form;
  @override
  ConsumerState<CourierApplicationForm> createState() =>
      _CourierApplicationFormState();
}

class _CourierApplicationFormState
    extends ConsumerState<CourierApplicationForm> {
  final controllers = <String, TextEditingController>{};
  final selections = <String, String>{};
  final files = <String, List<PlatformFile>>{};
  bool sending = false;
  String message = '';
  bool success = false;
  bool get internal => widget.form.submissionType == 'courier-internal';
  List<CmsFormField> get fields =>
      courierFormDefinitions[internal ? 0 : 1].fields.map((field) {
        final labels = widget.form.fields.where(
          (item) => item.key == field.key,
        );
        return field.copyWith(
          label: labels.isEmpty ? field.label : labels.first.label,
        );
      }).toList();
  @override
  void initState() {
    super.initState();
    for (final field in fields) {
      controllers[field.key] = TextEditingController();
    }
  }

  @override
  void dispose() {
    for (final controller in controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> choose(String key) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      allowMultiple: true,
      withData: true,
    );
    if (!mounted || result == null) return;
    final combined = {
      ...files,
      key: [...?files[key], ...result.files],
    };
    final error = validateCourierFiles(
      combined.values.expand((items) => items),
    );
    if (error != null) {
      setState(() {
        message = error;
        success = false;
      });
      return;
    }
    setState(() {
      files[key] = combined[key]!;
      message = '';
    });
  }

  Future<void> submit() async {
    final values = {
      for (final field in fields)
        field.key: courierDigits(
          (selections[field.key] ?? controllers[field.key]!.text).trim(),
        ),
    };
    final error =
        validateCourierValues(internal, values) ??
        validateCourierFiles(files.values.expand((items) => items));
    if (error != null) {
      setState(() {
        message = error;
        success = false;
      });
      return;
    }
    setState(() {
      sending = true;
      message = '';
      success = false;
    });
    try {
      final result = await ref
          .read(courierApiProvider)
          .submit(internal, values, files);
      if (!mounted) return;
      setState(() {
        success = true;
        message =
            '${result['message']}\nكود الطلب: ${result['application_code']}';
        files.clear();
        selections.clear();
        for (final controller in controllers.values) {
          controller.clear();
        }
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        message = error is StateError
            ? error.message.toString()
            : 'تعذر الاتصال بخدمة التقديم. حاول مرة أخرى لاحقًا';
      });
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => AdminPanel(
    title: widget.form.title,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final field in fields)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: courierChoices.containsKey(field.key)
                ? DropdownButtonFormField<String>(
                    key: ValueKey(
                      'courier-${field.key}-${selections[field.key]}',
                    ),
                    initialValue: selections[field.key],
                    decoration: InputDecoration(labelText: '${field.label} *'),
                    items: [
                      for (final entry in courierChoices[field.key]!.entries)
                        DropdownMenuItem(
                          value: entry.key,
                          child: Text(entry.value),
                        ),
                    ],
                    onChanged: sending
                        ? null
                        : (value) =>
                              setState(() => selections[field.key] = value!),
                  )
                : TextField(
                    key: ValueKey('courier-${field.key}'),
                    controller: controllers[field.key],
                    enabled: !sending,
                    decoration: InputDecoration(
                      labelText: '${field.label}${field.required ? ' *' : ''}',
                      hintText: field.type == CmsFormFieldType.date
                          ? '2028-12-31'
                          : null,
                    ),
                    keyboardType: field.type == CmsFormFieldType.number
                        ? TextInputType.number
                        : field.type == CmsFormFieldType.phone
                        ? TextInputType.phone
                        : TextInputType.text,
                  ),
          ),
        Text(
          'المرفقات اختيارية • PDF أو JPEG أو PNG • 5 ميجابايت لكل ملف',
          style: appText(color: AppColors.muted),
        ),
        const SizedBox(height: 12),
        for (final entry in courierFileSections(internal).entries) ...[
          OutlinedButton.icon(
            onPressed: sending ? null : () => choose(entry.key),
            icon: const Icon(Icons.attach_file),
            label: Text(entry.value),
          ),
          for (final file in files[entry.key] ?? <PlatformFile>[])
            ListTile(
              title: Text(file.name),
              trailing: IconButton(
                tooltip: 'إزالة الملف',
                onPressed: sending
                    ? null
                    : () => setState(() => files[entry.key]!.remove(file)),
                icon: const Icon(Icons.close),
              ),
            ),
        ],
        if (message.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              message,
              key: const ValueKey('courier-result'),
              style: appText(
                color: success ? AppColors.green : AppColors.danger,
                height: 1.7,
              ),
            ),
          ),
        FilledButton.icon(
          key: const ValueKey('submit-courier'),
          onPressed: sending ? null : submit,
          icon: const Icon(Icons.send),
          label: Text(sending ? 'جاري الإرسال...' : 'إرسال طلب التقديم'),
        ),
      ],
    ),
  );
}

class CourierAdminEditor extends ConsumerWidget {
  const CourierAdminEditor({required this.form, super.key});
  final CmsFormDefinition form;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(cmsProvider.notifier);
    return AdminPanel(
      title: form.title,
      child: Column(
        children: [
          CmsTextField(
            label: 'عنوان البطاقة',
            initialValue: form.title,
            onSave: (value) =>
                controller.updateJoinForm(form.copyWith(title: value)),
          ),
          CmsTextField(
            label: 'الجمهور',
            initialValue: form.audience,
            onSave: (value) =>
                controller.updateJoinForm(form.copyWith(audience: value)),
          ),
          CmsTextField(
            label: 'الوصف',
            initialValue: form.description,
            onSave: (value) =>
                controller.updateJoinForm(form.copyWith(description: value)),
          ),
          for (var i = 0; i < form.fields.length; i++)
            CmsTextField(
              label: 'عنوان الحقل ${i + 1}',
              initialValue: form.fields[i].label,
              onSave: (value) {
                final fields = [...form.fields];
                fields[i] = fields[i].copyWith(label: value);
                return controller.updateJoinForm(form.copyWith(fields: fields));
              },
            ),
          SwitchListTile(
            title: const Text('تفعيل النموذج'),
            value: form.enabled,
            onChanged: (value) =>
                controller.updateJoinForm(form.copyWith(enabled: value)),
          ),
          AdminActionButton(
            label: 'حذف النموذج',
            icon: Icons.delete_outline,
            danger: true,
            onPressed: () => controller.deleteJoinForm(form.slug),
          ),
        ],
      ),
    );
  }
}
