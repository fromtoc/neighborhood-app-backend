package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.result.ApiResponse;
import com.example.app.entity.DevQuestion;
import com.example.app.mapper.DevQuestionMapper;
import com.example.app.service.TelegramService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/devlog")
@RequiredArgsConstructor
@Tag(name = "DevQuestion", description = "開發者 Q&A")
public class DevQuestionController {

    private final DevQuestionMapper devQuestionMapper;
    private final TelegramService telegramService;

    /** App 端提問 */
    @PostMapping
    @Operation(summary = "提交開發問題")
    public ApiResponse<DevQuestion> ask(@RequestBody Map<String, String> body) {
        String question = body.getOrDefault("question", "").trim();
        String askedBy = body.getOrDefault("askedBy", "App");
        if (question.isEmpty()) {
            return ApiResponse.success(null);
        }

        DevQuestion dq = new DevQuestion();
        dq.setQuestion(question);
        dq.setStatus("pending");
        dq.setAskedBy(askedBy);
        dq.setCreatedAt(LocalDateTime.now());
        devQuestionMapper.insert(dq);

        telegramService.notify("DevQuestion",
            String.format("❓ 新問題 #%d\n來自: %s\n%s", dq.getId(), askedBy, question));

        return ApiResponse.success(dq);
    }

    /** 取得待回答的問題 */
    @GetMapping("/pending")
    @Operation(summary = "取得待回答的問題")
    public ApiResponse<List<DevQuestion>> getPending() {
        List<DevQuestion> list = devQuestionMapper.selectList(
            new LambdaQueryWrapper<DevQuestion>()
                .eq(DevQuestion::getStatus, "pending")
                .orderByAsc(DevQuestion::getCreatedAt)
        );
        return ApiResponse.success(list);
    }

    /** 回答問題 */
    @PatchMapping("/{id}")
    @Operation(summary = "回答問題")
    public ApiResponse<DevQuestion> answer(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String answer = body.getOrDefault("answer", "").trim();
        if (answer.isEmpty()) return ApiResponse.success(null);

        DevQuestion dq = devQuestionMapper.selectById(id);
        if (dq == null) return ApiResponse.success(null);

        dq.setAnswer(answer);
        dq.setStatus("answered");
        dq.setAnsweredAt(LocalDateTime.now());
        devQuestionMapper.updateById(dq);

        telegramService.notify("DevAnswer",
            String.format("✅ 問題 #%d 已回答\n❓ %s\n💬 %s",
                dq.getId(),
                dq.getQuestion().length() > 100 ? dq.getQuestion().substring(0, 100) + "..." : dq.getQuestion(),
                answer.length() > 200 ? answer.substring(0, 200) + "..." : answer));

        return ApiResponse.success(dq);
    }

    /** App 端查看已回答的問題 */
    @GetMapping("/answered")
    @Operation(summary = "取得已回答的問題")
    public ApiResponse<List<DevQuestion>> getAnswered() {
        List<DevQuestion> list = devQuestionMapper.selectList(
            new LambdaQueryWrapper<DevQuestion>()
                .eq(DevQuestion::getStatus, "answered")
                .orderByDesc(DevQuestion::getAnsweredAt)
                .last("LIMIT 20")
        );
        return ApiResponse.success(list);
    }

    /** App 端查看所有問題 */
    @GetMapping
    @Operation(summary = "取得所有問題")
    public ApiResponse<List<DevQuestion>> getAll() {
        List<DevQuestion> list = devQuestionMapper.selectList(
            new LambdaQueryWrapper<DevQuestion>()
                .orderByDesc(DevQuestion::getCreatedAt)
                .last("LIMIT 50")
        );
        return ApiResponse.success(list);
    }
}
