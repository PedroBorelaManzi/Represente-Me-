const fs = require('fs');

const path = 'C:\\Users\\Pedro\\.gemini\\antigravity\\brain\\Represente-Me!\\src\\pages\\ClientDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /const submitUpload = async \(\) => \{[\s\S]*?(?=const saveNewCategory = async \(\) => \{)/;

const fixedCode =   const submitUpload = async () => {
    if (!selectedFile || !user || !id) return;

    try {
      setIsUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = \\___\___\\;
      const filePath = \\/\/\\;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Conversao correta de valor padrao BR para float do banco
      const rawVal = orderValue || "0";
      let numericValue = 0;
      if (rawVal.includes('.') && rawVal.includes(',')) {
         const lastComma = rawVal.lastIndexOf(',');
         const lastDot = rawVal.lastIndexOf('.');
         if (lastComma > lastDot) numericValue = parseFloat(rawVal.replace(/\\./g, "").replace(",", "."));
         else numericValue = parseFloat(rawVal.replace(/,/g, ""));
      } else if (rawVal.includes(',') && !rawVal.includes('.')) {
         numericValue = parseFloat(rawVal.replace(",", "."));
      } else {
         numericValue = parseFloat(rawVal);
      }

      const { error: dbError } = await supabase
        .from('client_files')
        .insert([{
          user_id: user.id,
          client_id: id,
          file_name: fileName,
          file_path: filePath,
          category: selectedCategory,
          value: numericValue || null
        }]);

      if (dbError) throw dbError;

      // Se tem valor, e um pedido! Insere em orders e reseta o alerta do cliente
      if (numericValue > 0) {
        await supabase.from('orders').insert([{
          user_id: user.id,
          client_id: id,
          value: numericValue,
          category: selectedCategory,
          description: \Pedido via Upload: \\
        }]);
      }

      toast.success("Arquivo anexado com sucesso!");
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setOrderValue("");
      loadClientData();
    } catch (err: any) {
      console.error("Upload error details:", err);
      toast.error("Erro no upload: " + (err.message || "Token expirado. Refaça o login."));
    } finally {
      setIsUploading(false);
    }
  };

  ;

content = content.replace(regex, fixedCode);
fs.writeFileSync(path, content, 'utf8');
console.log('File fixed successfully');