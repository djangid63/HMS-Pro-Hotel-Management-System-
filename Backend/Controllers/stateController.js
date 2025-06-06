const stateModel = require('../Models/stateModel')
const locationModel = require('../Models/locationModel')
const hotelModel = require('../Models/hotelModel');
const roomModel = require('../Models/roomModel');

exports.addState = async (req, res) => {
  try {
    const { state, code } = req.body;
    const existing = await stateModel.findOne({ $or: [{ state }, { code }] });

    if (existing) {
      return res.status(400).json({ message: "State already exists" });
    }

    const userId = req.user._id;

    const stateData = new stateModel({ state, code, userId })
    const saveData = await stateData.save()
    return res.status(200).json({ status: true, message: "State added successfully", updatedState: saveData })
  } catch (error) {
    console.log("-------State--------", error);
    return res.status(401).json({ success: false, message: `Failed to add state, ${error}` });
  }
}

exports.getAllStates = async (req, res) => {
  try {
    const stateDisabled = await stateModel.find({ isDisable: true })
    const stateData = await stateModel.find({ isDisable: false });
    return res.status(200).json({ status: true, message: "State fetched Successfully", state: stateData, disabledState: stateDisabled })
  } catch (error) {
    console.log("Get state--------", error);
    return res.status(401).json({ success: false, message: `Failed to get state, ${error}` });
  }
}

exports.updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { state, code } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "State ID is required" });
    }


    const existing = await stateModel.findOne({
      state: state,
    });

    if (existing) {
      return res.status(400).json({ message: "State name already exists" });
    }

    const updatedState = await stateModel.findByIdAndUpdate(
      id,
      { state, code },
      { new: true, }
    );

    if (!updatedState) {
      return res.status(404).json({ success: false, message: "State not found" });
    }

    return res.status(200).json({
      success: true,
      message: "State updated successfully",
      state: updatedState
    });
  } catch (error) {
    console.log("Update state error:", error);
    return res.status(500).json({
      success: false,
      message: `Failed to update state: ${error.message}`
    });
  }
}


exports.softDelete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "State ID is required"
      });
    }

    const state = await stateModel.findById(id);
    // console.log("state by stateCon 71", state);

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found"
      });
    }

    const disableState = await stateModel.findByIdAndUpdate(
      id,
      { isDisable: !state.isDisable },
      { new: true }
    );

    if (!disableState) {
      return res.status(404).json({
        success: false,
        message: "State not found"
      });
    }

    const disableLocation = await locationModel.updateMany(
      { stateId: id },
      { isDisable: disableState.isDisable },
      { new: true }
    );


    const locations = await locationModel.find({ stateId: id });
    const locationIds = locations.map(location => location._id);
    await hotelModel.updateMany(
      { locationId: locationIds },
      { isDisable: disableState.isDisable }
    );


    const hotels = await hotelModel.find({ locationId: locationIds });
    const hotelIds = hotels.map(hotel => hotel._id);
    await roomModel.updateMany(
      { hotelId: hotelIds },
      { isDisable: disableState.isDisable }
    );


    return res.status(200).json({
      success: true,
      message: "State disabled successfully"
    });
  } catch (error) {
    console.log("Soft delete state error:", error);
    return res.status(500).json({
      success: false,
      message: `Failed to disable state: ${error.message}`
    });
  }
}

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "State ID is required"
      });
    }

    // Find all locations associated with the state
    const locations = await locationModel.find({ stateId: id });
    const locationIds = locations.map(location => location._id);

    // Find all hotels associated with these locations
    const hotels = await hotelModel.find({ locationId: locationIds });
    const hotelIds = hotels.map(hotel => hotel._id);

    // Delete all rooms associated with the hotels
    const roomModel = require('../Models/roomModel');
    await roomModel.deleteMany({ hotelId: hotelIds });

    // Delete all hotels associated with the locations
    await hotelModel.deleteMany({ locationId: locationIds });

    // Delete all locations associated with the state
    await locationModel.deleteMany({ stateId: id });

    // Finally delete the state itself
    const deletedState = await stateModel.findByIdAndDelete(id);

    if (!deletedState) {
      return res.status(404).json({
        success: false,
        message: "State not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "State and all associated data deleted successfully"
    });
  } catch (error) {
    console.log("Hard delete state error:", error);
    return res.status(500).json({
      success: false,
      message: `Failed to delete state: ${error.message}`
    });
  }
}