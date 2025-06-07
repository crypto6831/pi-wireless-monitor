# Floor Plan Display Fix

## Issue Found
The floor plan upload functionality was working, but the floor plan image was not displaying after upload. Investigation revealed that the API call to fetch the floor plan image was missing the required `floorId` query parameter.

## Root Cause
1. The backend API endpoint `/api/locations/:id/floorplan/image` requires a `floorId` query parameter
2. The frontend was only passing the `locationId` but not the `floorId`
3. This caused the API to return an error when trying to fetch the image

## Files Modified

### 1. `/dashboard/src/store/slices/floorPlanSlice.js`
- Updated `fetchFloorPlanImage` thunk to accept an object with both `locationId` and `floorId`
- Changed from: `async (locationId, { rejectWithValue })`
- Changed to: `async ({ locationId, floorId }, { rejectWithValue })`

### 2. `/dashboard/src/services/api.js`
- Updated `getFloorPlanImage` function to accept and pass the `floorId` parameter
- Added `params: { floorId }` to the axios request

### 3. `/dashboard/src/components/floorplan/FloorPlanViewer.js`
- Updated two places where `fetchFloorPlanImage` is called:
  - In the `useEffect` hook that loads the image when floor changes
  - In the upload callback that reloads the image after successful upload
- Now passes an object with both `locationId` and `floorId`

## Testing Steps
1. Navigate to the Floor Plans page
2. Select a location and floor
3. Upload a floor plan image
4. The image should now display correctly in the viewer
5. Refresh the page - the image should persist

## Additional Notes
- The upload functionality was already working correctly
- The issue was only with displaying the uploaded image
- No changes were needed to the backend code