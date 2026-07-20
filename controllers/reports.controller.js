import Account from '../models/accounts.model.js';
import JournalEntry from '../models/journal.model.js';

export const getTrialBalance = async (req, res) => {
  try {
    const hideZero = req.query.hideZero === 'true';

    // 1. Fetch all accounts sorted by code
    const accounts = await Account.find({}).sort({ code: 1 }).lean();
    console.log("Accounts Count:", accounts.length);

    if (!accounts || accounts.length === 0) {
      return res.status(200).json({
        success: true,
        data: { rows: [], grandTotals: { totalDebit: 0, totalCredit: 0, isBalanced: true } }
      });
    }

    // 2. Aggregate Balances from Journal Entries (Directly matching account IDs)
    const balances = await JournalEntry.aggregate([
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.accountId",
          totalDebit: { $sum: "$lines.debit" },
          totalCredit: { $sum: "$lines.credit" }
        }
      }
    ]);
    console.log("Balances Fetched:", balances.length)

    const balanceMap = {};
    balances.forEach(b => {
      if (b._id) {
        balanceMap[b._id.toString()] = {
          debit: Number(b.totalDebit || 0),
          credit: Number(b.totalCredit || 0)
        };
      }
    });

    // 3. Build Account Map with initial balances
    const accountMap = {};
    accounts.forEach(acc => {
      const idStr = acc._id.toString();
      const b = balanceMap[idStr] || { debit: 0, credit: 0 };

      accountMap[idStr] = {
        _id: idStr,
        code: acc.code || '',
        name: acc.name || '',
        type: acc.type || '',
        level: Number(acc.level || 1),
        parentId: acc.parentId ? acc.parentId.toString() : null,
        debit: b.debit,
        credit: b.credit,
        children: []
      };
    });

    // 4. Build Strict Tree Hierarchy matching Chart of Accounts
    const tree = [];
    accounts.forEach(acc => {
      const idStr = acc._id.toString();
      const node = accountMap[idStr];
      const parentIdStr = acc.parentId ? acc.parentId.toString() : null;

      if (parentIdStr && accountMap[parentIdStr]) {
        accountMap[parentIdStr].children.push(node);
      } else {
        tree.push(node);
      }
    });

    // 5. Recursive Bottom-Up Rollup (Level 3 -> Level 2 -> Level 1)
    const calculateSubtreeTotals = (node) => {
      let currentDebit = Number(node.debit || 0);
      let currentCredit = Number(node.credit || 0);

      if (node.children && node.children.length > 0) {
        let childrenDebitSum = 0;
        let childrenCreditSum = 0;

        node.children.forEach(child => {
          const childTotals = calculateSubtreeTotals(child);
          childrenDebitSum += childTotals.debit;
          childrenCreditSum += childTotals.credit;
        });

        currentDebit += childrenDebitSum;
        currentCredit += childrenCreditSum;
      }

      node.debit = currentDebit;
      node.credit = currentCredit;

      return { debit: currentDebit, credit: currentCredit };
    };

    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    tree.forEach(rootNode => {
      const rootTotals = calculateSubtreeTotals(rootNode);
      grandTotalDebit += rootTotals.debit;
      grandTotalCredit += rootTotals.credit;
    });

    // 6. Flatten Tree and Inject SUBTOTAL Rows for Folders / Parents
    const flattenReport = (nodes, depth = 0) => {
      let reportRows = [];

      nodes.forEach(node => {
        const hasChildren = node.children && node.children.length > 0;

        if (hideZero && Number(node.debit || 0) === 0 && Number(node.credit || 0) === 0) {
          return;
        }

        // Header / Folder Row (e.g. Assets, Inventory)
        reportRows.push({
          _id: node._id,
          parentId: node.parentId,
          code: node.code,
          name: node.name,
          debit: hasChildren ? null : node.debit, // Headers don't show direct debit to avoid duplication
          credit: hasChildren ? null : node.credit,
          depth: depth,
          level: node.level,
          hasChildren: hasChildren,
          rowType: hasChildren ? 'HEADER' : 'ACCOUNT'
        });

        // If it has children, process children first, then push the SUBTOTAL row
        if (hasChildren) {
          const childRows = flattenReport(node.children, depth + 1);
          reportRows = reportRows.concat(childRows);

          // Subtotal Row injected right after its children group
          reportRows.push({
            _id: `subtotal-${node._id}`,
            parentId: node.parentId,
            headerId: node._id,
            code: '',
            name: `Total ${node.name}`,
            debit: node.debit,    // Accumulated Rollup Sum
            credit: node.credit,  // Accumulated Rollup Sum
            depth: depth,
            level: node.level,
            hasChildren: false,
            rowType: 'SUBTOTAL'
          });
        }
      });

      return reportRows;
    };

    const finalRows = flattenReport(tree);
console.log("Final Rows sent to UI:", finalRows.length)
    return res.status(200).json({
      success: true,
      data: {
        rows: finalRows,
        grandTotals: {
          totalDebit: grandTotalDebit,
          totalCredit: grandTotalCredit,
          isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01
        }
      }
    });

  } catch (error) {
    console.error("Trial Balance Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};