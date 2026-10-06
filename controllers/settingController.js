import Setting from '../models/settingModel.js';

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
    const settings = await Setting.find({});
    res.json(settings);
};

// @desc    Update setting
// @route   PUT /api/settings/:key
// @access  Private/Admin
const updateSetting = async (req, res) => {
    const { value } = req.body;
    const setting = await Setting.findOne({ key: req.params.key });

    if (setting) {
        setting.value = value;
        const updatedSetting = await setting.save();
        res.json(updatedSetting);
    } else {
        // Create if not exists
        const newSetting = await Setting.create({
            key: req.params.key,
            value: value
        });
        res.json(newSetting);
    }
};

// @desc    Get setting by key
// @route   GET /api/settings/:key
// @access  Public
const getSettingByKey = async (req, res) => {
    const setting = await Setting.findOne({ key: req.params.key });
    if (setting) {
        res.json(setting);
    } else {
        res.status(404).json({ message: 'Setting not found' });
    }
};

export { getSettings, updateSetting, getSettingByKey };
