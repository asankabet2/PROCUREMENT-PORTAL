import { useState } from 'react';
import { Upload, Loader2, X, CheckCircle, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  onImport: (items: any[]) => void;
  onClose: () => void;
  existingItems?: any[];
}

interface PreviewItem {
  itemNo?: number;
  description: string;
  unit: string;
  quantity: number;
  estimatedUnitPrice: number;
  total?: number;
  isValid: boolean;
  errors: string[];
}

export default function ExcelImport({ onImport, onClose, existingItems = [] }: ExcelImportProps) {
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        setError('The file is empty. Please provide a file with data.');
        setLoading(false);
        return;
      }

      // Parse and validate items
      // Parse and validate items - removed the unused 'index' parameter
        const parsedItems: PreviewItem[] = jsonData.map((row: any) => {
        const errors: string[] = [];
        
        // Map columns (support different column names)
        const description = row['Description'] || row['description'] || row['Item Description'] || row['Item'] || '';
        const unit = row['Unit'] || row['unit'] || '';
        const quantity = parseFloat(row['Quantity'] || row['quantity'] || 0);
        const unitPrice = parseFloat(row['Unit Price'] || row['unitPrice'] || row['Price'] || row['price'] || 0);

        if (!description) errors.push('Description is required');
        if (!unit) errors.push('Unit is required');
        if (isNaN(quantity) || quantity <= 0) errors.push('Quantity must be a positive number');
        if (isNaN(unitPrice) || unitPrice < 0) errors.push('Unit price must be a valid number');

        return {
            description: description.toString().trim(),
            unit: unit.toString().trim(),
            quantity: isNaN(quantity) ? 0 : quantity,
            estimatedUnitPrice: isNaN(unitPrice) ? 0 : unitPrice,
            total: quantity * unitPrice,
            isValid: errors.length === 0,
            errors,
        };
        });

      // Filter out completely empty rows
      const validItems = parsedItems.filter(item => 
        item.description || item.unit || item.quantity > 0 || item.estimatedUnitPrice > 0
      );

      if (validItems.length === 0) {
        setError('No valid data found in the file. Please check the format.');
        setLoading(false);
        return;
      }

      setPreviewData(validItems);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setError('Failed to parse the file. Please ensure it\'s a valid Excel or CSV file.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const validItemsOnly = previewData.filter(item => item.isValid);
    
    // Add item numbers and create final items
    const existingCount = existingItems.length;
    const newItems = validItemsOnly.map((item, index) => ({
      itemNo: existingCount + index + 1,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      estimatedUnitPrice: item.estimatedUnitPrice,
    }));

    onImport(newItems);
    onClose();
  };

  const downloadTemplate = () => {
    const template = [
      { Description: 'Item 1', Unit: 'Piece', Quantity: 10, 'Unit Price': 100.00 },
      { Description: 'Item 2', Unit: 'Set', Quantity: 5, 'Unit Price': 250.00 },
      { Description: 'Item 3', Unit: 'Box', Quantity: 20, 'Unit Price': 50.00 },
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tender Items');
    XLSX.writeFile(wb, 'tender_items_template.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-primary" />
            <h2 className="text-lg font-bold">Import Tender Items from Excel</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-6 flex-1 overflow-auto">
            <div className="text-center mb-6">
              <p className="text-muted-foreground mb-4">
                Upload an Excel or CSV file with your tender items.
                <br />
                The file should have columns: <strong>Description, Unit, Quantity, Unit Price</strong>
              </p>
              <button
                onClick={downloadTemplate}
                className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
              >
                <Download size={14} /> Download Template
              </button>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.xlsm"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
                disabled={loading}
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                {loading ? (
                  <Loader2 size={48} className="animate-spin text-primary" />
                ) : (
                  <Upload size={48} className="text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {loading ? 'Processing file...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx, .xls, .csv files
                  </p>
                </div>
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle size={16} className="inline mr-2" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 overflow-auto">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">File: {fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Found {previewData.length} item(s) | {previewData.filter(i => i.isValid).length} valid
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('upload')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={previewData.filter(i => i.isValid).length === 0}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
                  >
                    Import Valid Items
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20 sticky top-0">
                    <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Unit</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Quantity</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Unit Price</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((item, idx) => (
                    <tr key={idx} className={`border-b border-border/50 ${!item.isValid ? 'bg-destructive/5' : ''}`}>
                      <td className="p-3">
                        {item.isValid ? (
                          <CheckCircle size={16} className="text-success" />
                        ) : (
                          <AlertTriangle size={16} className="text-destructive" />
                        )}
                      </td>
                      <td className="p-3">
                        <span className={!item.description ? 'text-destructive' : ''}>
                          {item.description || 'Missing'}
                        </span>
                        {item.errors.includes('Description is required') && (
                          <p className="text-xs text-destructive">Required</p>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={!item.unit ? 'text-destructive' : ''}>
                          {item.unit || 'Missing'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={item.quantity <= 0 ? 'text-destructive' : ''}>
                          {item.quantity || 0}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={item.estimatedUnitPrice < 0 ? 'text-destructive' : ''}>
                          {item.estimatedUnitPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {(item.quantity * item.estimatedUnitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <p><b>Tip:</b> Your Excel file should have columns: Description, Unit, Quantity, Unit Price</p>
          <p>The item numbers will be automatically assigned based on existing items</p>
        </div>
      </div>
    </div>
  );
}