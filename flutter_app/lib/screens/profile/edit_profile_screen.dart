import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../models/user.dart';
import '../../utils/constants.dart';
import '../../utils/helpers.dart';
import '../../widgets/loading_overlay.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

bool isValidUrl(String url) {
  final uri = Uri.tryParse(url);
  return uri != null && uri.hasAbsolutePath && (uri.scheme == 'http' || uri.scheme == 'https');
}

bool isValidEmail(String email) {
  return RegExp(
          r'^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$')
      .hasMatch(email);
}

bool isValidPhoneNumber(String phoneNumber) {
  // A simple regex for phone numbers, consider a more robust one for production
  if (phoneNumber.length < 7 || phoneNumber.length > 15) return false;
  return RegExp(r'^\+?[0-9. -]+$').hasMatch(phoneNumber);
}

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({Key? key}) : super(key: key);

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _bioController = TextEditingController();
  final _locationController = TextEditingController();
  final _websiteController = TextEditingController();
  
  bool _isLoading = false;
  File? _selectedImage;
  final ImagePicker _imagePicker = ImagePicker();
  
  @override
  void initState() {
    super.initState();
    _loadUserData();
  }
  
  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    _locationController.dispose();
    _websiteController.dispose();
    super.dispose();
  }
  
  void _loadUserData() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    
    if (user != null && user.profile != null) {
      _nameController.text = user.username;
      _emailController.text = user.email;
      _phoneController.text = user.profile!.phone ?? '';
      _bioController.text = user.profile!.bio ?? '';
      _locationController.text = "${user.profile!.city ?? ''}, ${user.profile!.country ?? ''}";
      _websiteController.text = ''; // website is not in the model
    }
  }
  
  Future<void> _pickImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 80,
      );
      
      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, 'Failed to pick image: ${e.toString()}');
      }
    }
  }
  
  Future<void> _takePhoto() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 80,
      );
      
      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        AppHelpers.showErrorMessage(context, 'Failed to take photo: ${e.toString()}');
      }
    }
  }
  
  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.of(context).pop();
                _pickImage();
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take a Photo'),
              onTap: () {
                Navigator.of(context).pop();
                _takePhoto();
              },
            ),
            if (_selectedImage != null || 
                Provider.of<AuthProvider>(context, listen: false).user?.profile?.avatarUrl != null)
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: const Text('Remove Photo'),
                onTap: () {
                  Navigator.of(context).pop();
                  setState(() {
                    _selectedImage = null;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }
  
  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      // Create updated profile data
      final profileData = {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim(),
        'phoneNumber': _phoneController.text.trim(),
        'bio': _bioController.text.trim(),
        'location': _locationController.text.trim(),
        'website': _websiteController.text.trim(),
      };
      
      // Update profile
      await authProvider.updateProfile(profileData, _selectedImage);
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        
        AppHelpers.showSuccessMessage(context, 'Profile updated successfully');
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        AppHelpers.showErrorMessage(context, 'Failed to update profile: ${e.toString()}');
      }
    }
  }
  
  Widget _buildProfileImage() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    
    return Center(
      child: Stack(
        children: [
          CircleAvatar(
            radius: 60,
            backgroundColor: Colors.grey[300],
            child: _selectedImage != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(60),
                    child: Image.file(
                      _selectedImage!,
                      width: 120,
                      height: 120,
                      fit: BoxFit.cover,
                    ),
                  )
                : user?.profile?.avatarUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(60),
                        child: Image.network(
                          user!.profile!.avatarUrl!,
                          width: 120,
                          height: 120,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Icon(
                              Icons.person,
                              size: 60,
                              color: Colors.grey[600],
                            );
                          },
                        ),
                      )
                    : Icon(
                        Icons.person,
                        size: 60,
                        color: Colors.grey[600],
                      ),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: GestureDetector(
              onTap: _showImagePickerOptions,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white,
                    width: 2,
                  ),
                ),
                child: const Icon(
                  Icons.camera_alt,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check),
            onPressed: _isLoading ? null : _saveProfile,
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Profile Image
                _buildProfileImage(),
                const SizedBox(height: 32),
                
                // Basic Information
                Text(
                  'Basic Information',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                
                CustomTextField(
                  controller: _nameController,
                  labelText: 'Full Name',
                  prefixIcon: Icons.person,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your name';
                    }
                    if (value.trim().length < 2) {
                      return 'Name must be at least 2 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                CustomTextField(
                  controller: _emailController,
                  labelText: 'Email Address',
                  prefixIcon: Icons.email,
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your email';
                    }
                    if (!isValidEmail(value.trim())) {
                      return 'Please enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                CustomTextField(
                  controller: _phoneController,
                  labelText: 'Phone Number (Optional)',
                  prefixIcon: Icons.phone,
                  keyboardType: TextInputType.phone,
                  validator: (value) {
                    if (value != null && value.trim().isNotEmpty) {
                      if (!isValidPhoneNumber(value.trim())) {
                        return 'Please enter a valid phone number';
                      }
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                
                // Additional Information
                Text(
                  'Additional Information',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                
                CustomTextField(
                  controller: _bioController,
                  labelText: 'Bio (Optional)',
                  prefixIcon: Icons.info,
                  maxLines: 3,
                  maxLength: 200,
                  validator: (value) {
                    if (value != null && value.length > 200) {
                      return 'Bio must be less than 200 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                CustomTextField(
                  controller: _locationController,
                  labelText: 'Location (Optional)',
                  prefixIcon: Icons.location_on,
                  validator: (value) {
                    if (value != null && value.length > 100) {
                      return 'Location must be less than 100 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                
                CustomTextField(
                  controller: _websiteController,
                  labelText: 'Website (Optional)',
                  prefixIcon: Icons.web,
                  keyboardType: TextInputType.url,
                  validator: (value) {
                    if (value != null && value.trim().isNotEmpty) {
                      if (!isValidUrl(value.trim())) {
                        return 'Please enter a valid URL';
                      }
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 32),
                
                // Save Button
                CustomButton(
                  text: 'Save Changes',
                  onPressed: _isLoading ? null : _saveProfile,
                  isLoading: _isLoading,
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}